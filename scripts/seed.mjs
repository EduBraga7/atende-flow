import fs from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');
const STORE_PATH = path.join(DATA_DIR, 'atendeflow_store.json');
const SAMPLE_PATH = path.join(DATA_DIR, 'sample-knowledge', 'clinica_sorriso_faq.txt');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const sampleText = fs.readFileSync(SAMPLE_PATH, 'utf-8');

// Chunker simples para o seed inicial
function chunkText(text, docId, docTitle) {
  const normalized = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const paragraphs = normalized.split(/\n\s*\n/).filter(p => p.trim().length > 0);
  
  const chunks = [];
  let chunkIndex = 0;
  let currentChunk = '';
  
  for (const para of paragraphs) {
    if (!currentChunk) {
      currentChunk = para.trim();
    } else if ((currentChunk + '\n\n' + para).length <= 650) {
      currentChunk += '\n\n' + para.trim();
    } else {
      chunks.push({
        id: `${docId}_chunk_${chunkIndex}`,
        documentId: docId,
        documentTitle: docTitle,
        content: currentChunk.trim(),
        chunkIndex,
        startChar: 0,
        endChar: currentChunk.length,
      });
      chunkIndex++;
      currentChunk = para.trim();
    }
  }

  if (currentChunk.trim().length > 0) {
    chunks.push({
      id: `${docId}_chunk_${chunkIndex}`,
      documentId: docId,
      documentTitle: docTitle,
      content: currentChunk.trim(),
      chunkIndex,
      startChar: 0,
      endChar: currentChunk.length,
    });
  }

  return chunks;
}

const docId = 'doc_clinica_sorriso_faq';
const docTitle = 'Clínica Sorriso & Bem-Estar (Base Oficial)';
const chunks = chunkText(sampleText, docId, docTitle);

const metadata = {
  id: docId,
  title: docTitle,
  filename: 'clinica_sorriso_faq.txt',
  fileType: 'txt',
  sizeBytes: Buffer.byteLength(sampleText, 'utf-8'),
  createdAt: new Date().toISOString(),
  chunkCount: chunks.length,
};

const store = {
  documents: [metadata],
  chunks,
};

fs.writeFileSync(STORE_PATH, JSON.stringify(store, null, 2), 'utf-8');
console.log(`✅ Seed concluído com sucesso: ${chunks.length} chunks indexados na base local!`);
