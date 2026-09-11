import { NextRequest, NextResponse } from 'next/server';
import { processRagQuery } from '@/lib/rag/engine';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { message, history, apiKey } = body;

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return NextResponse.json({ error: 'Mensagem não informada.' }, { status: 400 });
    }

    const response = await processRagQuery(message, history || [], apiKey);
    return NextResponse.json(response);
  } catch (error) {
    console.error('Erro na rota de chat:', error);
    return NextResponse.json(
      { error: 'Falha ao processar mensagem do chat.' },
      { status: 500 }
    );
  }
}
