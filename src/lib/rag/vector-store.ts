import fs from 'fs';
import path from 'path';
import { DocumentMetadata, DocumentChunk, SearchMatch } from './types';

interface StoreSchema {
  documents: DocumentMetadata[];
  chunks: DocumentChunk[];
}

const DATA_DIR = path.join(process.cwd(), 'data');
const STORE_PATH = path.join(DATA_DIR, 'atendeflow_store.json');

function ensureDataDir(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function loadStore(): StoreSchema {
  ensureDataDir();
  if (!fs.existsSync(STORE_PATH)) {
    const initial: StoreSchema = { documents: [], chunks: [] };
    fs.writeFileSync(STORE_PATH, JSON.stringify(initial, null, 2), 'utf-8');
    return initial;
  }
  try {
    const raw = fs.readFileSync(STORE_PATH, 'utf-8');
    return JSON.parse(raw);
  } catch (error) {
    console.error('Erro ao ler vector store:', error);
    return { documents: [], chunks: [] };
  }
}

function saveStore(store: StoreSchema): void {
  ensureDataDir();
  fs.writeFileSync(STORE_PATH, JSON.stringify(store, null, 2), 'utf-8');
}

/**
 * Calcula a similaridade de cosseno entre dois vetores numéricos.
 */
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

/**
 * Similaridade baseada em termos/palavras-chave (fallback quando embeddings não estiverem disponíveis).
 */
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
    // Também testa forma singular aproximada
    const singular = token.endsWith('s') && token.length > 3 ? token.slice(0, -1) : token;
    if (normContent.includes(token) || normContent.includes(singular)) {
      hits++;
    }
  }

  return hits / tokens.length;
}

export class VectorStore {
  static listDocuments(): DocumentMetadata[] {
    const store = loadStore();
    return store.documents;
  }

  static getDocument(id: string): DocumentMetadata | undefined {
    const store = loadStore();
    return store.documents.find(d => d.id === id);
  }

  static addDocument(metadata: DocumentMetadata, chunks: DocumentChunk[]): void {
    const store = loadStore();
    // Remove se já existir com mesmo ID
    store.documents = store.documents.filter(d => d.id !== metadata.id);
    store.chunks = store.chunks.filter(c => c.documentId !== metadata.id);

    store.documents.push(metadata);
    store.chunks.push(...chunks);
    saveStore(store);
  }

  static deleteDocument(id: string): void {
    const store = loadStore();
    store.documents = store.documents.filter(d => d.id !== id);
    store.chunks = store.chunks.filter(c => c.documentId !== id);
    saveStore(store);
  }

  static getAllChunks(): DocumentChunk[] {
    const store = loadStore();
    return store.chunks;
  }

  static updateChunkEmbeddings(chunksWithEmbeddings: DocumentChunk[]): void {
    const store = loadStore();
    const map = new Map(chunksWithEmbeddings.map(c => [c.id, c.embedding]));

    store.chunks = store.chunks.map(chunk => {
      if (map.has(chunk.id)) {
        return { ...chunk, embedding: map.get(chunk.id) };
      }
      return chunk;
    });

    saveStore(store);
  }

  /**
   * Busca os chunks mais relevantes por similaridade vetorial (ou fallback por termos)
   */
  static search(
    queryText: string,
    queryVector?: number[],
    topK = 4,
    minSimilarity = 0.25
  ): SearchMatch[] {
    const store = loadStore();
    const matches: SearchMatch[] = [];

    const hasVectors = queryVector && queryVector.length > 0;

    for (const chunk of store.chunks) {
      let similarity = 0;

      if (hasVectors && chunk.embedding && chunk.embedding.length > 0) {
        similarity = cosineSimilarity(queryVector, chunk.embedding);
      } else {
        // Fallback para termos se embeddings não estiverem disponíveis
        similarity = keywordSimilarity(queryText, chunk.content);
      }

      if (similarity >= minSimilarity) {
        matches.push({ chunk, similarity });
      }
    }

    // Ordena do mais similar para o menos similar
    matches.sort((a, b) => b.similarity - a.similarity);

    return matches.slice(0, topK);
  }

  static getStats(): { totalDocuments: number; totalChunks: number; chunksWithEmbeddings: number } {
    const store = loadStore();
    const withEmbeddings = store.chunks.filter(c => c.embedding && c.embedding.length > 0).length;
    return {
      totalDocuments: store.documents.length,
      totalChunks: store.chunks.length,
      chunksWithEmbeddings: withEmbeddings,
    };
  }
}
