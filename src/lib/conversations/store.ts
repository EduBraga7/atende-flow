import fs from 'fs';
import path from 'path';
import {
  Conversation,
  ConversationMessage,
  ConversationStatus,
  ConversationStats,
} from './types';

const DATA_DIR = path.join(process.cwd(), 'data');
const STORE_PATH = path.join(DATA_DIR, 'conversations.json');

function ensureDataDir(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}


function loadStore(): Conversation[] {
  ensureDataDir();
  if (!fs.existsSync(STORE_PATH)) {
    fs.writeFileSync(STORE_PATH, JSON.stringify([], null, 2), 'utf-8');
    return [];
  }
  try {
    const raw = fs.readFileSync(STORE_PATH, 'utf-8');
    return JSON.parse(raw);
  } catch (error) {
    console.error('Erro ao ler conversations store:', error);
    return [];
  }
}

function saveStore(conversations: Conversation[]): void {
  ensureDataDir();
  fs.writeFileSync(STORE_PATH, JSON.stringify(conversations, null, 2), 'utf-8');
}

export class ConversationStore {
  static list(status?: ConversationStatus, search?: string): Conversation[] {
    let list = loadStore();

    if (status) {
      list = list.filter((c) => c.status === status);
    }

    if (search && search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (c) =>
          c.customerName.toLowerCase().includes(q) ||
          (c.customerPhone && c.customerPhone.includes(q)) ||
          (c.lastMessage && c.lastMessage.toLowerCase().includes(q))
      );
    }

    // Ordena do mais recente para o mais antigo
    return list.sort(
      (a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime()
    );
  }

  static get(id: string): Conversation | null {
    const list = loadStore();
    return list.find((c) => c.id === id) || null;
  }

  static create(data: Partial<Conversation>): Conversation {
    const list = loadStore();
    const now = new Date().toISOString();
    const newConv: Conversation = {
      id: data.id || `conv_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      customerName: data.customerName || 'Novo Paciente',
      customerPhone: data.customerPhone || '',
      channel: data.channel || 'whatsapp',
      status: data.status || 'bot',
      unreadCount: 0,
      lastMessage: data.lastMessage || 'Conversa iniciada',
      lastMessageAt: now,
      createdAt: now,
      handoffReason: data.handoffReason,
      messages: data.messages || [],
    };

    list.unshift(newConv);
    saveStore(list);
    return newConv;
  }

  static addMessage(
    conversationId: string,
    messageData: Omit<ConversationMessage, 'id' | 'timestamp'> & { timestamp?: string }
  ): { conversation: Conversation; message: ConversationMessage } | null {
    const list = loadStore();
    const convIndex = list.findIndex((c) => c.id === conversationId);
    if (convIndex === -1) return null;

    const conv = list[convIndex];
    const now = new Date();
    const timeFormatted =
      messageData.timestamp ||
      now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    const newMsg: ConversationMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      role: messageData.role,
      senderType: messageData.senderType,
      senderName: messageData.senderName,
      content: messageData.content,
      timestamp: timeFormatted,
      sources: messageData.sources,
      handoffTriggered: messageData.handoffTriggered,
      handoffReason: messageData.handoffReason,
    };

    conv.messages.push(newMsg);
    conv.lastMessage = newMsg.content;
    conv.lastMessageAt = now.toISOString();

    if (newMsg.senderType === 'customer') {
      conv.unreadCount += 1;
    }

    if (newMsg.handoffTriggered) {
      conv.status = 'waiting_human';
      conv.handoffReason = newMsg.handoffReason;
    } else if (newMsg.senderType === 'human_agent') {
      // Se estava aguardando humano, assume o atendimento
      if (conv.status === 'waiting_human') {
        conv.status = 'human';
      }
      conv.unreadCount = 0;
    }

    list[convIndex] = conv;
    saveStore(list);

    return { conversation: conv, message: newMsg };
  }

  static updateStatus(
    conversationId: string,
    status: ConversationStatus,
    handoffReason?: string
  ): Conversation | null {
    const list = loadStore();
    const convIndex = list.findIndex((c) => c.id === conversationId);
    if (convIndex === -1) return null;

    list[convIndex].status = status;
    if (handoffReason !== undefined) {
      list[convIndex].handoffReason = handoffReason;
    }
    if (status === 'human') {
      list[convIndex].unreadCount = 0;
    }

    saveStore(list);
    return list[convIndex];
  }

  static markAsRead(conversationId: string): void {
    const list = loadStore();
    const conv = list.find((c) => c.id === conversationId);
    if (conv && conv.unreadCount > 0) {
      conv.unreadCount = 0;
      saveStore(list);
    }
  }

  static delete(id: string): boolean {
    const list = loadStore();
    const filtered = list.filter((c) => c.id !== id);
    if (filtered.length === list.length) return false;
    saveStore(filtered);
    return true;
  }

  static getStats(): ConversationStats {
    const list = loadStore();
    return {
      total: list.length,
      bot: list.filter((c) => c.status === 'bot').length,
      waiting_human: list.filter((c) => c.status === 'waiting_human').length,
      human: list.filter((c) => c.status === 'human').length,
      closed: list.filter((c) => c.status === 'closed').length,
    };
  }
}
