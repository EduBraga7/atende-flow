import { VectorStore } from './vector-store';
import { generateEmbedding, generateChatResponse, getGeminiApiKey } from './gemini';
import { getBotConfig } from '../config';
import { SourceReference } from './types';

export interface RagResponse {
  answer: string;
  sources: SourceReference[];
  handoffTriggered: boolean;
  handoffReason?: string;
}

/**
 * Avalia se a mensagem do usuário ativou gatilhos de transbordo (emergência ou pedido de humano).
 */
export function checkHandoff(
  userMessage: string,
  keywords: string[]
): { triggered: boolean; reason?: string } {
  const lower = userMessage.toLowerCase();

  const emergencyWords = [
    'dor insuportavel',
    'dor insuportável',
    'muita dor',
    'dor aguda',
    'sangramento',
    'inchaco',
    'inchaço',
    'emergencia',
    'emergência',
    'urgencia',
    'urgência',
    'caiu dente',
    'quebrei o dente',
    'acidente',
  ];

  for (const word of emergencyWords) {
    if (lower.includes(word)) {
      return {
        triggered: true,
        reason: 'Situação de urgência / dor aguda detectada. Prioridade máxima para plantão.',
      };
    }
  }

  for (const keyword of keywords) {
    if (lower.includes(keyword.toLowerCase())) {
      return {
        triggered: true,
        reason: `Solicitação direta detectada: "${keyword}".`,
      };
    }
  }

  return { triggered: false };
}

/**
 * Executa o fluxo RAG completo:
 * 1. Análise de Transbordo
 * 2. Vetorização da Pergunta
 * 3. Recuperação de Contexto (Retrieval)
 * 4. Geração Aumentada (Generation)
 */
export async function processRagQuery(
  userMessage: string,
  conversationHistory: { role: 'user' | 'assistant'; content: string }[] = [],
  customApiKey?: string
): Promise<RagResponse> {
  const config = await getBotConfig();
  const apiKey = getGeminiApiKey(customApiKey || config.geminiApiKey);

  // 1. Verificação de transbordo
  const handoff = checkHandoff(userMessage, config.handoffKeywords);

  // Para não perder contexto em perguntas curtas (ex: "Uteis", "Hoje"), 
  // combinamos a última mensagem do usuário ou do assistente com a atual para a busca
  const lastMessages = conversationHistory.slice(-2).map(h => h.content).join(' ');
  const searchQuery = lastMessages ? `${lastMessages} ${userMessage}` : userMessage;

  // 2. Vetorização da pergunta (se houver API key)
  let queryVector: number[] | undefined = undefined;
  if (apiKey) {
    const vector = await generateEmbedding(searchQuery, apiKey);
    if (vector) {
      queryVector = vector;
    }
  }

  // 3. Busca dos trechos mais relevantes no Vector Store
  // Buscar no Vector Store usando o searchQuery completo
  const matches = await VectorStore.search(searchQuery, queryVector, config.maxChunks ?? 5, config.similarityThreshold ?? 0.2);

  const sources: SourceReference[] = matches.map(m => ({
    documentId: m.chunk.documentId,
    documentTitle: m.chunk.documentTitle,
    content: m.chunk.content,
    similarity: Math.round(m.similarity * 100) / 100,
    chunkIndex: m.chunk.chunkIndex,
  }));

  // Se não houver chave de API configurada, oferece resposta informativa amigável
  if (!apiKey) {
    let fallbackText = `**[Modo Demonstração Offline]**\n\nIdentifiquei ${matches.length} trecho(s) relevante(s) na base de dados para sua pergunta.\n\n`;

    if (matches.length > 0) {
      fallbackText += `*Principais informações encontradas:*\n\n> "${matches[0].chunk.content.slice(0, 300)}..."\n\n`;
      fallbackText += `💡 *Para respostas completas em linguagem natural e streaming via Gemini, adicione sua GEMINI_API_KEY no menu de configurações acima ou no arquivo .env.local.*`;
    } else {
      fallbackText += `Nenhum documento cadastrado cobriu essa pergunta. Faça upload de arquivos na aba **Base de Conhecimento** ou clique em **Carregar Exemplo**.`;
    }

    if (handoff.triggered) {
      fallbackText += `\n\n⚠️ **Alerta de Transbordo Ativado:** ${handoff.reason}`;
    }

    return {
      answer: fallbackText,
      sources,
      handoffTriggered: handoff.triggered,
      handoffReason: handoff.reason,
    };
  }

  // 4. Montagem do contexto para o Gemini
  const contextText =
    sources.length > 0
      ? sources
          .map(
            (s, idx) =>
              `[DOCUMENTO: ${s.documentTitle} | TRECHO ${idx + 1}]\n${s.content}`
          )
          .join('\n\n---\n\n')
      : 'Nenhum documento específico encontrado para esta pergunta.';

  const now = new Date();
  const dateStr = now.toLocaleDateString('pt-BR');
  const timeStr = now.toLocaleTimeString('pt-BR');
  const weekDay = new Intl.DateTimeFormat('pt-BR', { weekday: 'long' }).format(now);

  const systemInstruction = `${config.systemPrompt}

Data atual: ${dateStr} (${weekDay})
Hora atual: ${timeStr}

BASE DE CONHECIMENTO DISPONÍVEL:
${contextText}

INSTRUÇÕES ESPECÍFICAS DE RESPOSTA:
1. Responda em português de forma clara, prestativa e amigável.
2. Baseie sua resposta nas informações da base de conhecimento acima.
3. Se o usuário estiver relatando urgência que exija ação presencial, recomende procurar a equipe local.
4. Caso a resposta não esteja na base, declare com educação que não tem essa informação no momento.`;

  // Histórico resumido das últimas mensagens
  const historySummary = conversationHistory
    .slice(-4)
    .map(h => `${h.role === 'user' ? 'Paciente' : 'Assistente'}: ${h.content}`)
    .join('\n');

  const fullPrompt = historySummary
    ? `Histórico recente da conversa:\n${historySummary}\n\nNova mensagem do Paciente: ${userMessage}`
    : `Mensagem do Paciente: ${userMessage}`;

  try {
    const answer = await generateChatResponse(fullPrompt, systemInstruction, apiKey);
    return {
      answer,
      sources,
      handoffTriggered: handoff.triggered,
      handoffReason: handoff.reason,
    };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Erro ao processar consulta';
    console.error('Erro no RAG Engine:', error);
    return {
      answer: `Desculpe, ocorreu uma instabilidade ao conectar com o modelo de IA: ${errorMessage}`,
      sources,
      handoffTriggered: handoff.triggered,
      handoffReason: handoff.reason,
    };
  }
}
