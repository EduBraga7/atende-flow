import { DocumentChunk } from './types';

export interface ChunkOptions {
  chunkSize?: number;
  chunkOverlap?: number;
}

/**
 * Divide o texto em chunks inteligentes respeitando parágrafos e frases,
 * garantindo overlap para preservar o contexto entre limites de chunks.
 */
export function chunkText(
  text: string,
  documentId: string,
  documentTitle: string,
  options: ChunkOptions = {}
): DocumentChunk[] {
  const chunkSize = options.chunkSize || 600;
  const chunkOverlap = options.chunkOverlap || 120;

  if (!text || text.trim().length === 0) {
    return [];
  }

  // Normaliza quebras de linha e limpa espaços excessivos
  const normalized = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const paragraphs = normalized.split(/\n\s*\n/);

  const rawBlocks: string[] = [];
  for (const para of paragraphs) {
    const trimmed = para.trim();
    if (trimmed.length === 0) continue;

    if (trimmed.length <= chunkSize) {
      rawBlocks.push(trimmed);
    } else {
      // Se o parágrafo for maior que o chunkSize, divide por frases
      const sentences = trimmed.split(/(?<=[.?!])\s+/);
      let currentSentenceBlock = '';

      for (const sentence of sentences) {
        if ((currentSentenceBlock + ' ' + sentence).trim().length > chunkSize) {
          if (currentSentenceBlock) {
            rawBlocks.push(currentSentenceBlock.trim());
          }
          currentSentenceBlock = sentence;
        } else {
          currentSentenceBlock = currentSentenceBlock
            ? currentSentenceBlock + ' ' + sentence
            : sentence;
        }
      }
      if (currentSentenceBlock.trim().length > 0) {
        rawBlocks.push(currentSentenceBlock.trim());
      }
    }
  }

  // Agrupa blocos menores mantendo chunkSize e aplicando overlap
  const chunks: DocumentChunk[] = [];
  let currentChunkText = '';
  let currentStartChar = 0;
  let chunkIndex = 0;

  for (const block of rawBlocks) {
    if (!currentChunkText) {
      currentChunkText = block;
    } else if ((currentChunkText + '\n\n' + block).length <= chunkSize) {
      currentChunkText += '\n\n' + block;
    } else {
      // Salva o chunk atual
      const endChar = currentStartChar + currentChunkText.length;
      chunks.push({
        id: `${documentId}_chunk_${chunkIndex}`,
        documentId,
        documentTitle,
        content: currentChunkText.trim(),
        chunkIndex,
        startChar: currentStartChar,
        endChar,
      });
      chunkIndex++;

      // Calcula o overlap a partir do final do chunk anterior
      const overlapStart = Math.max(0, currentChunkText.length - chunkOverlap);
      const overlapText = currentChunkText.substring(overlapStart).trim();

      currentStartChar = endChar - overlapText.length;
      currentChunkText = overlapText ? `${overlapText}\n\n${block}` : block;
    }
  }

  // Adiciona o último chunk se sobrou conteúdo
  if (currentChunkText.trim().length > 0) {
    const endChar = currentStartChar + currentChunkText.length;
    chunks.push({
      id: `${documentId}_chunk_${chunkIndex}`,
      documentId,
      documentTitle,
      content: currentChunkText.trim(),
      chunkIndex,
      startChar: currentStartChar,
      endChar,
    });
  }

  return chunks;
}
