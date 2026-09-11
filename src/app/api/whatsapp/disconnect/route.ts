import { NextRequest, NextResponse } from 'next/server';
import { WhatsAppManager } from '@/lib/whatsapp/manager';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const clearSession = body.clearSession !== false;
    await WhatsAppManager.disconnect(clearSession);
    return NextResponse.json({ success: true, status: 'disconnected' });
  } catch (error) {
    console.error('Erro ao desconectar WhatsApp:', error);
    return NextResponse.json(
      { error: 'Erro ao desconectar WhatsApp' },
      { status: 500 }
    );
  }
}
