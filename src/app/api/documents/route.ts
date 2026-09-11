import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { VectorStore } from '@/lib/rag/vector-store';
import { chunkText } from '@/lib/rag/chunker';
import { generateEmbedding, getGeminiApiKey } from '@/lib/rag/gemini';
import { getBotConfig } from '@/lib/config';
import { DocumentMetadata, DocumentChunk } from '@/lib/rag/types';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const documents = VectorStore.listDocuments();
    const stats = VectorStore.getStats();
    return NextResponse.json({ documents, stats });
  } catch (error) {
    console.error('Erro ao listar documentos:', error);
    return NextResponse.json({ error: 'Erro ao listar documentos' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get('content-type') || '';
    const config = getBotConfig();
    const apiKey = getGeminiApiKey(config.geminiApiKey);

    let docTitle = '';
    let docFilename = '';
    let docContent = '';
    let fileType: 'pdf' | 'txt' | 'md' | 'manual' = 'txt';
    let sizeBytes = 0;

    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      const file = formData.get('file') as File | null;
      const titleOverride = formData.get('title') as string | null;

      if (!file) {
        return NextResponse.json({ error: 'Nenhum arquivo enviado' }, { status: 400 });
      }

      docFilename = file.name;
      docTitle = titleOverride || file.name.replace(/\.[^/.]+$/, '');
      sizeBytes = file.size;

      const buffer = Buffer.from(await file.arrayBuffer());

      if (file.name.endsWith('.pdf')) {
        fileType = 'pdf';
        try {
          // Dynamic import of pdf-parse to avoid SSR issues
          // eslint-disable-next-line @typescript-eslint/no-require-imports
          const pdfParse = require('pdf-parse');
          const pdfData = await pdfParse(buffer);
          docContent = pdfData.text;
        } catch (pdfErr) {
          console.error('Erro ao processar PDF:', pdfErr);
          return NextResponse.json(
            { error: 'Falha ao extrair texto do PDF enviado.' },
            { status: 400 }
          );
        }
      } else {
        fileType = file.name.endsWith('.md') ? 'md' : 'txt';
        docContent = buffer.toString('utf-8');
      }
    } else {
      // Recebido como JSON (ex: Carga do Exemplo da Clínica ou inserção manual de texto)
      const body = await req.json();

      if (body.isSample) {
        const samplePath = path.join(process.cwd(), 'data', 'sample-knowledge', 'clinica_sorriso_faq.txt');
        if (!fs.existsSync(samplePath)) {
          return NextResponse.json({ error: 'Arquivo de exemplo não encontrado' }, { status: 404 });
        }
        docContent = fs.readFileSync(samplePath, 'utf-8');
        docTitle = 'Clínica Sorriso & Bem-Estar (Base Oficial)';
        docFilename = 'clinica_sorriso_faq.txt';
        fileType = 'txt';
        sizeBytes = Buffer.byteLength(docContent, 'utf-8');
      } else {
        docTitle = body.title || 'Documento sem título';
        docFilename = body.filename || `${docTitle}.txt`;
        docContent = body.content || '';
        fileType = body.fileType || 'manual';
        sizeBytes = Buffer.byteLength(docContent, 'utf-8');
      }
    }

    if (!docContent || docContent.trim().length === 0) {
      return NextResponse.json(
        { error: 'O documento está vazio ou não pôde ser lido.' },
        { status: 400 }
      );
    }

    const docId = `doc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    // 1. Chunking
    const chunks = chunkText(docContent, docId, docTitle, {
      chunkSize: 650,
      chunkOverlap: 120,
    });

    // 2. Geração de Embeddings (se houver API key)
    const enrichedChunks: DocumentChunk[] = [];
    for (const chunk of chunks) {
      let embedding: number[] | undefined = undefined;
      if (apiKey) {
        try {
          const emb = await generateEmbedding(chunk.content, apiKey);
          if (emb) embedding = emb;
        } catch (e) {
          console.warn(`Aviso: Falha ao gerar embedding para chunk ${chunk.id}:`, e);
        }
      }
      enrichedChunks.push({
        ...chunk,
        embedding,
      });
    }

    // 3. Metadata do documento
    const metadata: DocumentMetadata = {
      id: docId,
      title: docTitle,
      filename: docFilename,
      fileType,
      sizeBytes,
      createdAt: new Date().toISOString(),
      chunkCount: enrichedChunks.length,
    };

    // 4. Salvar no Vector Store
    VectorStore.addDocument(metadata, enrichedChunks);

    return NextResponse.json({
      success: true,
      document: metadata,
      chunksCreated: enrichedChunks.length,
      embeddingsGenerated: enrichedChunks.filter(c => !!c.embedding).length,
    });
  } catch (error) {
    console.error('Erro na ingestão do documento:', error);
    return NextResponse.json(
      { error: 'Erro interno ao processar e indexar documento.' },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID do documento é obrigatório' }, { status: 400 });
    }

    VectorStore.deleteDocument(id);
    return NextResponse.json({ success: true, deletedId: id });
  } catch (error) {
    console.error('Erro ao deletar documento:', error);
    return NextResponse.json({ error: 'Erro ao remover documento.' }, { status: 500 });
  }
}
