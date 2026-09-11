export type FileType = 'pdf' | 'txt' | 'md' | 'manual';

export interface DocumentMetadata {
  id: string;
  title: string;
  filename: string;
  fileType: FileType;
  sizeBytes: number;
  createdAt: string;
  chunkCount: number;
}

export interface DocumentChunk {
  id: string;
  documentId: string;
  documentTitle: string;
  content: string;
  chunkIndex: number;
  startChar: number;
  endChar: number;
  embedding?: number[];
}

export interface SearchMatch {
  chunk: DocumentChunk;
  similarity: number;
}

export interface SourceReference {
  documentId: string;
  documentTitle: string;
  content: string;
  similarity: number;
  chunkIndex: number;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  sources?: SourceReference[];
  handoffTriggered?: boolean;
  handoffReason?: string;
}

export interface BotConfig {
  businessName: string;
  systemPrompt: string;
  temperature: number;
  geminiApiKey?: string;
  handoffKeywords: string[];
  similarityThreshold?: number;
  maxChunks?: number;
}
