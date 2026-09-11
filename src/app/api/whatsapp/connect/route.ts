import { NextResponse } from 'next/server';
import { WhatsAppManager } from '@/lib/whatsapp/manager';

export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    const state = await WhatsAppManager.connect();
    return NextResponse.json({ success: true, state });
  } catch (error) {
    console.error('Erro ao iniciar conexão WhatsApp:', error);
    return NextResponse.json(
      { error: 'Falha ao iniciar conexão com WhatsApp' },
      { status: 500 }
    );
  }
}
