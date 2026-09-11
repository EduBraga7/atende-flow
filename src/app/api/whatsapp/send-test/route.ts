import { NextRequest, NextResponse } from 'next/server';
import { WhatsAppManager } from '@/lib/whatsapp/manager';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { phone, message } = body as { phone: string; message: string };

    if (!phone || !message) {
      return NextResponse.json(
        { error: 'Telefone e mensagem são obrigatórios' },
        { status: 400 }
      );
    }

    const state = WhatsAppManager.getState();
    if (state.status !== 'connected') {
      return NextResponse.json(
        { error: 'WhatsApp não está conectado. Escaneie o QR Code primeiro.' },
        { status: 400 }
      );
    }

    const sent = await WhatsAppManager.sendTextMessage(phone, message);
    if (!sent) {
      return NextResponse.json(
        { error: 'Falha ao transmitir mensagem via WhatsApp' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Erro ao enviar mensagem de teste:', error);
    return NextResponse.json(
      { error: 'Erro ao enviar mensagem de teste' },
      { status: 500 }
    );
  }
}
