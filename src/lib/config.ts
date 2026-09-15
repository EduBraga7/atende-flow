import { BotConfig } from './rag/types';
import { supabase } from './supabase';

export const DEFAULT_CONFIG: BotConfig = {
  businessName: 'Aikion Content',
  systemPrompt: `Você é a Aiko, uma assistente virtual de inteligência artificial da Aikion Content, uma agência de marketing.
Seu papel é tirar dúvidas de clientes e potenciais clientes sobre nossos serviços de marketing com clareza, energia e precisão, baseando-se ESTRITAMENTE nas informações dos documentos fornecidos.

DIRETRIZES:
1. Responda com um tom cordial, profissional e empático, refletindo o espírito de uma agência de marketing moderna.
2. Deixe claro sempre que adequado (e principalmente se perguntada) que você é uma IA para auxiliar no primeiro contato.
3. Se a informação estiver presente nos documentos, explique de forma clara e objetiva.
4. Se o cliente perguntar sobre orçamentos complexos ou informações que não constam nos documentos, seja sincera: diga gentilmente que não possui essa informação exata no momento e ofereça transferir para um especialista humano da nossa equipe.
5. NUNCA invente preços, serviços não listados ou prometa resultados que não estão na base de conhecimento.`,
  temperature: 0.3,
  geminiApiKey: '',
  handoffKeywords: [
    'atendente',
    'humano',
    'falar com alguém',
    'especialista',
    'comercial',
    'reunião',
    'reuniao',
    'orçamento complexo',
    'orçamento detalhado',
    'proposta'
  ],
  similarityThreshold: 0.2,
  maxChunks: 5,
};

export async function getBotConfig(): Promise<BotConfig> {
  const { data, error } = await supabase
    .from('bot_config')
    .select('*')
    .eq('id', 'default')
    .single();

  if (error || !data) {
    console.error('Erro ao ler configuração do bot do Supabase:', error);
    return DEFAULT_CONFIG;
  }

  return {
    ...DEFAULT_CONFIG,
    businessName: data.business_name,
    systemPrompt: data.bot_persona,
    similarityThreshold: data.similarity_threshold,
    maxChunks: data.max_chunks,
  };
}

export async function saveBotConfig(config: Partial<BotConfig>): Promise<BotConfig> {
  const current = await getBotConfig();
  const updated = { ...current, ...config };

  const { error } = await supabase
    .from('bot_config')
    .update({
      business_name: updated.businessName,
      bot_persona: updated.systemPrompt,
      similarity_threshold: updated.similarityThreshold,
      max_chunks: updated.maxChunks,
      updated_at: new Date().toISOString()
    })
    .eq('id', 'default');

  if (error) {
    console.error('Erro ao salvar config no Supabase:', error);
  }

  return updated;
}
