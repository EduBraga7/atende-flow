import { SourceReference } from '../rag/types';
export type { SourceReference };

export type ConversationStatus = 'bot' | 'waiting_human' | 'human' | 'closed';

export type ConversationChannel = 'web' | 'whatsapp';

export type SenderType = 'customer' | 'bot' | 'human_agent' | 'system';

export interface ConversationMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  senderType: SenderType;
  senderName?: string;
  content: string;
  timestamp: string;
  sources?: SourceReference[];
  handoffTriggered?: boolean;
  handoffReason?: string;
}

export interface Conversation {
  id: string;
  customerName: string;
  customerPhone?: string;
  channel: ConversationChannel;
  status: ConversationStatus;
  unreadCount: number;
  lastMessage?: string;
  lastMessageAt: string;
  createdAt: string;
  handoffReason?: string;
  messages: ConversationMessage[];
}

export interface ConversationStats {
  total: number;
  bot: number;
  waiting_human: number;
  human: number;
  closed: number;
}
