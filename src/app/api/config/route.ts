import { NextRequest, NextResponse } from 'next/server';
import { getBotConfig, saveBotConfig } from '@/lib/config';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const config = await getBotConfig();
    // Oculta a maior parte da chave por segurança se existir
    const maskedKey = config.geminiApiKey
      ? `${config.geminiApiKey.slice(0, 4)}...${config.geminiApiKey.slice(-4)}`
      : '';

    return NextResponse.json({
      ...config,
      hasApiKey: !!(config.geminiApiKey || process.env.GEMINI_API_KEY),
      maskedKey,
    });
  } catch (error) {
    console.error('Erro ao ler configuração:', error);
    return NextResponse.json({ error: 'Erro ao carregar configurações' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const updated = await saveBotConfig(body);
    return NextResponse.json({
      success: true,
      config: {
        ...updated,
        hasApiKey: !!(updated.geminiApiKey || process.env.GEMINI_API_KEY),
      },
    });
  } catch (error) {
    console.error('Erro ao salvar configuração:', error);
    return NextResponse.json({ error: 'Erro ao salvar configurações' }, { status: 500 });
  }
}
