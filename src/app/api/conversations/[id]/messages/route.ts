import { NextRequest, NextResponse } from 'next/server';
import { ConversationStore } from '@/lib/conversations/store';
import { processRagQuery } from '@/lib/rag/engine';
import { SenderType } from '@/lib/conversations/types';
import { WhatsAppManager } from '@/lib/whatsapp/manager';

export const dynamic = 'force-dynamic';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const conv = ConversationStore.get(id);

    if (!conv) {
      return NextResponse.json({ error: 'Conversa não encontrada' }, { status: 404 });
    }

    const body = await req.json();
    const { content, senderType, senderName } = body as {
      content: string;
      senderType?: SenderType;
      senderName?: string;
    };

    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return NextResponse.json({ error: 'Conteúdo da mensagem inválido' }, { status: 400 });
    }

    const type = senderType || 'customer';

    // 1. Caso do Atendente Humano respondendo
    if (type === 'human_agent') {
      const result = ConversationStore.addMessage(id, {
        role: 'assistant',
        senderType: 'human_agent',
        senderName: senderName || 'Atendente Humano',
        content: content.trim(),
      });

      // Se a conversa for de WhatsApp, despacha a resposta diretamente para o celular do paciente
      if (conv.channel === 'whatsapp' && conv.customerPhone) {
        WhatsAppManager.sendTextMessage(conv.customerPhone, content.trim()).catch((err) => {
          console.warn('Aviso: falha no envio WhatsApp:', err);
        });
      }

      return NextResponse.json({
        success: true,
        conversation: result?.conversation,
        message: result?.message,
      });
    }

    // 2. Caso de Mensagem do Cliente
    const userMsgResult = ConversationStore.addMessage(id, {
      role: 'user',
      senderType: 'customer',
      senderName: conv.customerName,
      content: content.trim(),
    });

    if (!userMsgResult) {
      return NextResponse.json({ error: 'Falha ao salvar mensagem' }, { status: 500 });
    }

    // Se o atendimento estiver sob responsabilidade humana direta ou encerrado, o bot não responde
    if (conv.status === 'human' || conv.status === 'closed') {
      return NextResponse.json({
        success: true,
        conversation: userMsgResult.conversation,
        userMessage: userMsgResult.message,
        botReplied: false,
      });
    }

    // 3. Se estiver em modo bot (ou recém disparado transbordo), processa via RAG
    const history = conv.messages.slice(-6).map((m) => ({
      role: (m.role === 'user' ? 'user' : 'assistant') as 'user' | 'assistant',
      content: m.content,
    }));

    const ragResponse = await processRagQuery(content.trim(), history);

    // Adiciona a resposta da IA
    const botMsgResult = ConversationStore.addMessage(id, {
      role: 'assistant',
      senderType: 'bot',
      senderName: 'Sofia IA',
      content: ragResponse.answer,
      sources: ragResponse.sources,
      handoffTriggered: ragResponse.handoffTriggered,
      handoffReason: ragResponse.handoffReason,
    });

    return NextResponse.json({
      success: true,
      conversation: botMsgResult?.conversation || userMsgResult.conversation,
      userMessage: userMsgResult.message,
      botMessage: botMsgResult?.message,
      botReplied: true,
    });
  } catch (error) {
    console.error('Erro ao enviar mensagem na conversa:', error);
    return NextResponse.json(
      { error: 'Erro interno ao processar mensagem.' },
      { status: 500 }
    );
  }
}
