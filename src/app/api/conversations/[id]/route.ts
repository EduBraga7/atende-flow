import { NextRequest, NextResponse } from 'next/server';
import { ConversationStore } from '@/lib/conversations/store';
import { ConversationStatus } from '@/lib/conversations/types';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const conversation = await ConversationStore.get(id);

    if (!conversation) {
      return NextResponse.json({ error: 'Conversa não encontrada' }, { status: 404 });
    }

    // Marca como lida ao abrir
    await ConversationStore.markAsRead(id);

    return NextResponse.json({ conversation });
  } catch (error) {
    console.error('Erro ao buscar conversa:', error);
    return NextResponse.json({ error: 'Erro ao buscar conversa' }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { status, handoffReason } = body as {
      status?: ConversationStatus;
      handoffReason?: string;
    };

    if (!status) {
      return NextResponse.json({ error: 'Status é obrigatório' }, { status: 400 });
    }

    const updated = await ConversationStore.updateStatus(id, status, handoffReason);
    if (!updated) {
      return NextResponse.json({ error: 'Conversa não encontrada' }, { status: 404 });
    }

    return NextResponse.json({ success: true, conversation: updated });
  } catch (error) {
    console.error('Erro ao atualizar status da conversa:', error);
    return NextResponse.json({ error: 'Erro ao atualizar conversa' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const deleted = await ConversationStore.delete(id);
    if (!deleted) {
      return NextResponse.json({ error: 'Conversa não encontrada' }, { status: 404 });
    }
    return NextResponse.json({ success: true, deletedId: id });
  } catch (error) {
    console.error('Erro ao excluir conversa:', error);
    return NextResponse.json({ error: 'Erro ao excluir conversa' }, { status: 500 });
  }
}
