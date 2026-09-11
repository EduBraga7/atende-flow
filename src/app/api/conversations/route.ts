import { NextRequest, NextResponse } from 'next/server';
import { ConversationStore } from '@/lib/conversations/store';
import { ConversationStatus } from '@/lib/conversations/types';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const statusParam = searchParams.get('status') as ConversationStatus | null;
    const search = searchParams.get('search') || undefined;

    const conversations = ConversationStore.list(statusParam || undefined, search);
    const stats = ConversationStore.getStats();

    return NextResponse.json({ conversations, stats });
  } catch (error) {
    console.error('Erro ao listar conversas:', error);
    return NextResponse.json({ error: 'Erro ao listar conversas' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const newConv = ConversationStore.create(body);
    return NextResponse.json({ success: true, conversation: newConv });
  } catch (error) {
    console.error('Erro ao criar conversa:', error);
    return NextResponse.json({ error: 'Erro ao criar nova conversa' }, { status: 500 });
  }
}
