/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { supabase } from '../supabase';
import { DocumentMetadata, DocumentChunk, SearchMatch } from './types';

export function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (!vecA || !vecB || vecA.length !== vecB.length) return 0;

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }

  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

function normalizeText(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

const STOP_WORDS = new Set([
  'que', 'qual', 'quais', 'como', 'para', 'com', 'sem', 'onde', 'quando',
  'voce', 'voces', 'esta', 'estao', 'sao', 'tem', 'temos', 'uma', 'umas',
  'uns', 'dos', 'das', 'aos', 'pelo', 'pela', 'por', 'sobre', 'mais', 'menos',
  'fazer', 'isso', 'aquilo', 'toda', 'todo', 'todos', 'todas', 'muito', 'muita'
]);

function keywordSimilarity(query: string, content: string): number {
  const normQuery = normalizeText(query);
  const normContent = normalizeText(content);

  const tokens = normQuery
    .split(/[^\w\d]+/)
    .filter(t => t.length > 2 && !STOP_WORDS.has(t));

  if (tokens.length === 0) {
    const rawTokens = normQuery.split(/[^\w\d]+/).filter(t => t.length > 2);
    if (rawTokens.length === 0) return 0;
    let hits = 0;
    for (const t of rawTokens) {
      if (normContent.includes(t)) hits++;
    }
    return hits / rawTokens.length;
  }

  let hits = 0;
  for (const token of tokens) {
    const singular = token.endsWith('s') && token.length > 3 ? token.slice(0, -1) : token;
    if (normContent.includes(token) || normContent.includes(singular)) {
      hits++;
    }
  }

  return hits / tokens.length;
}

export class VectorStore {
  static async listDocuments(): Promise<DocumentMetadata[]> {
    // Select documents and count their chunks
    const { data, error } = await supabase.from('documents').select(`
      id,
      title,
      type,
      created_at,
      document_chunks (id)
    `);

    if (error) {
      console.error('Error fetching documents:', error);
      return [];
    }

    return data.map((doc: any) => ({
      id: doc.id,
      title: doc.title,
      filename: doc.title, // Map as title since we don't have filename in schema
      fileType: doc.type as any,
      sizeBytes: 0, // Not available in schema
      createdAt: doc.created_at,
      chunkCount: doc.document_chunks?.length || 0,
    }));
  }

  static async getDocument(id: string): Promise<DocumentMetadata | undefined> {
    const { data, error } = await supabase.from('documents').select(`
      id,
      title,
      type,
      created_at,
      document_chunks (id)
    `).eq('id', id).single();

    if (error || !data) return undefined;

    return {
      id: data.id,
      title: data.title,
      filename: data.title,
      fileType: data.type as any,
      sizeBytes: 0,
      createdAt: data.created_at,
      chunkCount: data.document_chunks?.length || 0,
    };
  }

  static async addDocument(metadata: DocumentMetadata, chunks: DocumentChunk[]): Promise<void> {
    // Delete existing document if any (cascades chunks)
    await supabase.from('documents').delete().eq('id', metadata.id);

    const docRow = {
      id: metadata.id,
      title: metadata.title,
      content: chunks.map(c => c.content).join('\n\n'), // Since we must have a content column
      type: metadata.fileType,
      created_at: metadata.createdAt,
      updated_at: new Date().toISOString(),
    };

    const { error: docError } = await supabase.from('documents').insert(docRow);
    if (docError) {
      console.error('Error adding document:', docError);
      return;
    }

    if (chunks.length > 0) {
      const chunkRows = chunks.map(c => ({
        id: c.id,
        document_id: c.documentId,
        content: c.content,
        embedding: c.embedding || null, // Assuming vector(768) handles null or arrays
      }));

      const { error: chunksError } = await supabase.from('document_chunks').insert(chunkRows);
      if (chunksError) {
        console.error('Error adding chunks:', chunksError);
      }
    }
  }

  static async deleteDocument(id: string): Promise<void> {
    await supabase.from('documents').delete().eq('id', id);
  }

  static async getAllChunks(): Promise<DocumentChunk[]> {
    const { data, error } = await supabase.from('document_chunks').select(`
      id,
      document_id,
      content,
      embedding,
      documents (title)
    `);

    if (error) return [];

    return data.map((row: any) => ({
      id: row.id,
      documentId: row.document_id,
      documentTitle: row.documents?.title || '',
      content: row.content,
      chunkIndex: 0, // Not available in schema, assuming 0
      startChar: 0,
      endChar: 0,
      embedding: row.embedding ? JSON.parse(row.embedding) : undefined, // Assuming it comes as string or array
    }));
  }

  static async updateChunkEmbeddings(chunksWithEmbeddings: DocumentChunk[]): Promise<void> {
    for (const chunk of chunksWithEmbeddings) {
      if (chunk.embedding) {
        // vector type in postgres might need formatted array string like '[1,2,3]' 
        await supabase.from('document_chunks').update({
          embedding: `[${chunk.embedding.join(',')}]` as any
        }).eq('id', chunk.id);
      }
    }
  }

  static async search(
    queryText: string,
    queryVector?: number[],
    topK = 4,
    minSimilarity = 0.25
  ): Promise<SearchMatch[]> {
    // We will do similarity search in memory since match_documents doesn't exist
    const chunks = await this.getAllChunks();
    const matches: SearchMatch[] = [];

    const hasVectors = queryVector && queryVector.length > 0;

    for (const chunk of chunks) {
      let similarity = 0;

      if (hasVectors && chunk.embedding && chunk.embedding.length > 0) {
        similarity = cosineSimilarity(queryVector, chunk.embedding);
      } else {
        similarity = keywordSimilarity(queryText, chunk.content);
      }

      if (similarity >= minSimilarity) {
        matches.push({ chunk, similarity });
      }
    }

    matches.sort((a, b) => b.similarity - a.similarity);
    return matches.slice(0, topK);
  }

  static async getStats(): Promise<{ totalDocuments: number; totalChunks: number; chunksWithEmbeddings: number }> {
    const [{ count: docs }, { count: chunks }, { count: withEmb }] = await Promise.all([
      supabase.from('documents').select('id', { count: 'exact', head: true }),
      supabase.from('document_chunks').select('id', { count: 'exact', head: true }),
      supabase.from('document_chunks').select('id', { count: 'exact', head: true }).not('embedding', 'is', null)
    ]);

    return {
      totalDocuments: docs || 0,
      totalChunks: chunks || 0,
      chunksWithEmbeddings: withEmb || 0,
    };
  }
}
