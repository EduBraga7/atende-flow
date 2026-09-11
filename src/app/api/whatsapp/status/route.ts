import { NextResponse } from 'next/server';
import { WhatsAppManager } from '@/lib/whatsapp/manager';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const state = WhatsAppManager.getState();
    return NextResponse.json(state);
  } catch (error) {
    console.error('Erro ao consultar status do WhatsApp:', error);
    return NextResponse.json(
      { error: 'Erro ao consultar status do WhatsApp' },
      { status: 500 }
    );
  }
}
