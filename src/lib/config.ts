import fs from 'fs';
import path from 'path';
import { BotConfig } from './rag/types';

const DATA_DIR = path.join(process.cwd(), 'data');
const CONFIG_PATH = path.join(DATA_DIR, 'bot_config.json');

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

function ensureDataDir(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

export function getBotConfig(): BotConfig {
  ensureDataDir();
  if (!fs.existsSync(CONFIG_PATH)) {
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(DEFAULT_CONFIG, null, 2), 'utf-8');
    return DEFAULT_CONFIG;
  }
  try {
    const raw = fs.readFileSync(CONFIG_PATH, 'utf-8');
    return { ...DEFAULT_CONFIG, ...JSON.parse(raw) };
  } catch (error) {
    console.error('Erro ao ler configuração do bot:', error);
    return DEFAULT_CONFIG;
  }
}

export function saveBotConfig(config: Partial<BotConfig>): BotConfig {
  ensureDataDir();
  const current = getBotConfig();
  const updated: BotConfig = { ...current, ...config };
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(updated, null, 2), 'utf-8');
  return updated;
}
