/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { supabase } from '../supabase';
import { Conversation, ConversationMessage, ConversationStatus, ConversationStats } from './types';

export class ConversationStore {
  static async list(status?: ConversationStatus, search?: string): Promise<Conversation[]> {
    let query = supabase
      .from('conversations')
      .select(`
        *,
        messages (*)
      `)
      .order('last_message_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    const { data: convs, error } = await query;
    if (error) {
      console.error('Error fetching conversations:', error);
      return [];
    }

    let list = convs.map((row) => this.mapConversation(row));

    if (search && search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (c) =>
          c.customerName.toLowerCase().includes(q) ||
          (c.customerPhone && c.customerPhone.includes(q)) ||
          (c.lastMessage && c.lastMessage.toLowerCase().includes(q))
      );
    }

    return list;
  }

  static async get(id: string): Promise<Conversation | null> {
    const { data, error } = await supabase
      .from('conversations')
      .select(`*, messages (*)`)
      .eq('id', id)
      .single();

    if (error || !data) return null;
    return this.mapConversation(data);
  }

  static async create(data: Partial<Conversation>): Promise<Conversation> {
    const now = new Date().toISOString();
    const newId = data.id || `conv_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    
    const row = {
      id: newId,
      customer_name: data.customerName || 'Novo Paciente',
      customer_phone: data.customerPhone || '',
      channel: data.channel || 'whatsapp',
      status: data.status || 'bot',
      unread_count: 0,
      last_message: data.lastMessage || 'Conversa iniciada',
      last_message_at: now,
      handoff_reason: data.handoffReason || null,
    };

    const { error } = await supabase.from('conversations').insert(row);
    if (error) console.error('Error creating conversation:', error);

    const conv = await this.get(newId);
    return conv!;
  }

  static async addMessage(
    conversationId: string,
    messageData: Omit<ConversationMessage, 'id' | 'timestamp'> & { timestamp?: string }
  ): Promise<{ conversation: Conversation; message: ConversationMessage } | null> {
    const conv = await this.get(conversationId);
    if (!conv) return null;

    const now = new Date();
    const timeFormatted =
      messageData.timestamp ||
      now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    const msgId = `msg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const msgRow = {
      id: msgId,
      conversation_id: conversationId,
      role: messageData.role,
      content: messageData.content,
      timestamp: timeFormatted,
      sender_type: messageData.senderType,
      sender_name: messageData.senderName || null,
      handoff_triggered: messageData.handoffTriggered || false,
      sources: messageData.sources || null,
    };

    const { error: msgError } = await supabase.from('messages').insert(msgRow);
    if (msgError) console.error('Error adding message:', msgError);

    let newStatus = conv.status;
    let newHandoffReason = conv.handoffReason;
    let newUnreadCount = conv.unreadCount;

    if (messageData.senderType === 'customer') {
      newUnreadCount += 1;
    }

    if (messageData.handoffTriggered) {
      newStatus = 'waiting_human';
      newHandoffReason = messageData.handoffReason;
    } else if (messageData.senderType === 'human_agent') {
      if (newStatus === 'waiting_human') {
        newStatus = 'human';
      }
      newUnreadCount = 0;
    }

    const updateRow = {
      last_message: messageData.content,
      last_message_at: now.toISOString(),
      status: newStatus,
      handoff_reason: newHandoffReason,
      unread_count: newUnreadCount,
    };

    const { error: convError } = await supabase
      .from('conversations')
      .update(updateRow)
      .eq('id', conversationId);

    if (convError) console.error('Error updating conversation:', convError);

    const updatedConv = await this.get(conversationId);
    
    const message: ConversationMessage = {
      id: msgId,
      role: messageData.role,
      senderType: messageData.senderType,
      senderName: messageData.senderName,
      content: messageData.content,
      timestamp: timeFormatted,
      sources: messageData.sources,
      handoffTriggered: messageData.handoffTriggered,
      handoffReason: messageData.handoffReason,
    };

    return { conversation: updatedConv!, message };
  }

  static async updateStatus(
    conversationId: string,
    status: ConversationStatus,
    handoffReason?: string
  ): Promise<Conversation | null> {
    const updateRow: any = { status };
    if (handoffReason !== undefined) {
      updateRow.handoff_reason = handoffReason;
    }
    if (status === 'human') {
      updateRow.unread_count = 0;
    }

    const { error } = await supabase
      .from('conversations')
      .update(updateRow)
      .eq('id', conversationId);

    if (error) return null;
    return this.get(conversationId);
  }

  static async markAsRead(conversationId: string): Promise<void> {
    const { error } = await supabase
      .from('conversations')
      .update({ unread_count: 0 })
      .eq('id', conversationId)
      .gt('unread_count', 0);
  }

  static async delete(id: string): Promise<boolean> {
    const { error } = await supabase
      .from('conversations')
      .delete()
      .eq('id', id);
      
    if (error) return false;
    return true;
  }

  static async getStats(): Promise<ConversationStats> {
    const [total, bot, waiting_human, human, closed] = await Promise.all([
      supabase.from('conversations').select('id', { count: 'exact', head: true }),
      supabase.from('conversations').select('id', { count: 'exact', head: true }).eq('status', 'bot'),
      supabase.from('conversations').select('id', { count: 'exact', head: true }).eq('status', 'waiting_human'),
      supabase.from('conversations').select('id', { count: 'exact', head: true }).eq('status', 'human'),
      supabase.from('conversations').select('id', { count: 'exact', head: true }).eq('status', 'closed'),
    ]);

    return {
      total: total.count || 0,
      bot: bot.count || 0,
      waiting_human: waiting_human.count || 0,
      human: human.count || 0,
      closed: closed.count || 0,
    };
  }

  private static mapConversation(row: any): Conversation {
    const messages = (row.messages || []).map((m: any) => ({
      id: m.id,
      role: m.role,
      senderType: m.sender_type,
      senderName: m.sender_name || undefined,
      content: m.content,
      timestamp: m.timestamp,
      sources: m.sources || undefined,
      handoffTriggered: m.handoff_triggered,
    }));
    
    // Sort messages by created_at
    messages.sort((a: any, b: any) => {
      const aRaw = row.messages.find((x: any) => x.id === a.id);
      const bRaw = row.messages.find((x: any) => x.id === b.id);
      return new Date(aRaw?.created_at).getTime() - new Date(bRaw?.created_at).getTime();
    });

    return {
      id: row.id,
      customerName: row.customer_name,
      customerPhone: row.customer_phone || undefined,
      channel: row.channel,
      status: row.status,
      unreadCount: row.unread_count,
      lastMessage: row.last_message || undefined,
      lastMessageAt: row.last_message_at,
      createdAt: row.created_at,
      handoffReason: row.handoff_reason || undefined,
      messages,
    };
  }
}
