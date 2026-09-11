import { GoogleGenerativeAI } from '@google/generative-ai';

export function getGeminiApiKey(customKey?: string): string | undefined {
  return customKey || process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY;
}

const EMBEDDING_MODELS = ['gemini-embedding-001', 'gemini-embedding-2', 'text-embedding-004'];
const CHAT_MODELS = ['gemini-3.6-flash', 'gemini-3.5-flash-lite', 'gemini-1.5-flash'];

/**
 * Gera o vetor de embedding para um texto utilizando modelos compatíveis do Google Gemini.
 */
export async function generateEmbedding(text: string, customApiKey?: string): Promise<number[] | null> {
  const apiKey = getGeminiApiKey(customApiKey);
  if (!apiKey) {
    return null;
  }

  const genAI = new GoogleGenerativeAI(apiKey);

  for (const modelName of EMBEDDING_MODELS) {
    try {
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.embedContent(text);
      if (result?.embedding?.values) {
        return result.embedding.values;
      }
    } catch (error) {
      console.warn(`Tentativa com modelo de embedding ${modelName} falhou:`, error instanceof Error ? error.message : error);
    }
  }

  console.error('Erro ao gerar embedding no Gemini com todos os modelos suportados.');
  return null;
}

/**
 * Gera resposta em texto a partir do prompt e instruções de sistema utilizando o Gemini.
 */
export async function generateChatResponse(
  userPrompt: string,
  systemInstruction: string,
  customApiKey?: string
): Promise<string> {
  const apiKey = getGeminiApiKey(customApiKey);
  if (!apiKey) {
    throw new Error(
      'Chave GEMINI_API_KEY não configurada. Defina a variável GEMINI_API_KEY no arquivo .env.'
    );
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  let lastError: Error | null = null;

  for (const modelName of CHAT_MODELS) {
    try {
      const model = genAI.getGenerativeModel({
        model: modelName,
        systemInstruction,
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 800,
        },
      });

      const result = await model.generateContent(userPrompt);
      const text = result.response.text();
      if (text) {
        return text;
      }
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      console.warn(`Tentativa de resposta com modelo ${modelName} falhou, tentando próximo...`, lastError.message);
    }
  }

  throw lastError || new Error('Falha ao gerar resposta com modelos Gemini.');
}
