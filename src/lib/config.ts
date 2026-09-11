import { BotConfig } from './rag/types';
import { supabase } from './supabase';

export const DEFAULT_CONFIG: BotConfig = {
  businessName: 'Clínica Sorriso & Bem-Estar',
  systemPrompt: `Você é a Sofia, assistente virtual inteligente e acolhedora da Clínica Sorriso & Bem-Estar (Odontologia Integrada & Estética).
Seu papel é tirar dúvidas de pacientes e potenciais clientes com clareza, simpatia e precisão, baseando-se ESTRITAMENTE nas informações dos documentos fornecidos.

DIRETRIZES:
1. Responda com tom cordial, profissional e empático.
2. Se a informação estiver presente nos documentos, explique de forma clara e objetiva.
3. Se o paciente perguntar sobre valores, informe os valores médios contidos na base e reforce a necessidade de avaliação clínica presencial.
4. Se a informação NÃO constar nos documentos, seja sincera: diga gentilmente que não possui essa informação exata no momento e ofereça transferir para a equipe da recepção.
5. NUNCA invente preços, procedimentos não listados ou diagnósticos médicos.`,
  temperature: 0.3,
  geminiApiKey: '',
  handoffKeywords: [
    'atendente',
    'humano',
    'secretaria',
    'secretária',
    'agendar',
    'marcar consulta',
    'marcar horário',
    'falar com alguém',
    'dor insuportavel',
    'dor insuportável',
    'emergencia',
    'emergência',
    'urgencia',
    'urgência',
    'sangramento',
    'inchaco',
    'inchaço'
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
