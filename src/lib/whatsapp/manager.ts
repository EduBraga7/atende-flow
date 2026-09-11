import path from 'path';
import fs from 'fs';
import QRCode from 'qrcode';
import pino from 'pino';
import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState as initAuthState,
  WASocket,
  proto,
  Browsers,
} from '@whiskeysockets/baileys';
import { ConversationStore } from '../conversations/store';
import { processRagQuery } from '../rag/engine';
import { WhatsAppState } from './types';

const DATA_DIR = path.join(process.cwd(), 'data');
const AUTH_DIR = path.join(DATA_DIR, 'whatsapp_auth');

function ensureAuthDir(): void {
  if (!fs.existsSync(AUTH_DIR)) {
    fs.mkdirSync(AUTH_DIR, { recursive: true });
  }
}

const logger = pino({
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'SYS:standard',
    },
  },
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
});

class WhatsAppManagerClass {
  private socket: WASocket | null = null;
  private state: WhatsAppState = {
    status: 'disconnected',
  };
  private isInitializing = false;
  private processedMsgIds = new Set<string>();
  private pendingDebounce = new Map<
    string,
    {
      timeout: NodeJS.Timeout;
      texts: string[];
      remoteJid: string;
      customerName: string;
      conversationId: string;
      sock: WASocket;
    }
  >();

  constructor() {
    ensureAuthDir();
    // Verifica se já existem credenciais salvas
    if (fs.existsSync(path.join(AUTH_DIR, 'creds.json'))) {
      this.state.status = 'connecting';
      this.initSocket().catch((err) => {
        logger.error({ err }, 'Erro ao restaurar sessão WhatsApp');
        this.state.status = 'disconnected';
      });
    }
  }

  public getState(): WhatsAppState {
    return { ...this.state };
  }

  public async connect(): Promise<WhatsAppState> {
    if (this.state.status === 'connected') {
      return this.getState();
    }

    if (this.state.status === 'qr_ready' && this.state.qrCodeDataUrl) {
      return this.getState();
    }

    if (!this.socket && !this.isInitializing) {
      await this.initSocket();
    }

    // Aguarda até 3.5 segundos para já entregar o QR Code pronto na primeira resposta
    const start = Date.now();
    while (Date.now() - start < 3500) {
      const currentStatus = this.state.status as string;
      if (currentStatus === 'qr_ready' || currentStatus === 'connected') {
        break;
      }
      await new Promise((r) => setTimeout(r, 200));
    }

    return this.getState();
  }

  public async disconnect(clearSession = true): Promise<void> {
    try {
      if (this.socket) {
        this.socket.end(undefined);
        this.socket = null;
      }
    } catch (e) {
      console.warn('Aviso ao encerrar socket:', e);
    }

    this.state = {
      status: 'disconnected',
    };
    this.isInitializing = false;

    if (clearSession && fs.existsSync(AUTH_DIR)) {
      try {
        fs.rmSync(AUTH_DIR, { recursive: true, force: true });
        ensureAuthDir();
      } catch (err) {
        console.error('Erro ao limpar diretório de autenticação:', err);
      }
    }
  }

  public async sendTextMessage(toPhone: string, text: string): Promise<boolean> {
    if (!this.socket || this.state.status !== 'connected') {
      console.warn('Tentativa de envio de mensagem sem WhatsApp conectado.');
      return false;
    }

    try {
      let jid = '';
      if (toPhone.endsWith('@lid') || toPhone.includes('@lid')) {
        const clean = toPhone.replace(/\D/g, '');
        jid = `${clean}@lid`;
      } else {
        let clean = toPhone.replace(/\D/g, '');
        if (!clean.startsWith('55') && clean.length <= 11) {
          clean = `55${clean}`;
        }
        jid = `${clean}@s.whatsapp.net`;
      }

      await this.socket.sendMessage(jid, { text });
      return true;
    } catch (error) {
      console.error('Erro ao enviar mensagem via Baileys:', error);
      return false;
    }
  }

  private async initSocket(): Promise<void> {
    this.isInitializing = true;
    this.state.status = 'connecting';
    this.state.lastError = undefined;

    try {
      logger.info('initSocket called, loading auth state...');
      ensureAuthDir();
      const { state, saveCreds } = await initAuthState(AUTH_DIR);

      // Limpa socket e ouvintes anteriores para evitar instâncias duplicadas (zombies)
      if (this.socket) {
        try {
          this.socket.ev.removeAllListeners('connection.update');
          this.socket.ev.removeAllListeners('creds.update');
          this.socket.ev.removeAllListeners('messages.upsert');
          this.socket.end(undefined);
        } catch {}
        this.socket = null;
      }

      logger.info('makeWASocket initializing...');
      const sock = makeWASocket({
        auth: state,
        logger: pino({ level: 'silent' }),
        printQRInTerminal: false,
        browser: Browsers.ubuntu('Chrome'),
        connectTimeoutMs: 60000,
        defaultQueryTimeoutMs: 60000,
        keepAliveIntervalMs: 25000,
        getMessage: async () => undefined,
      });

      this.socket = sock;

      sock.ev.on('creds.update', saveCreds);

      sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;
        logger.info({
          connection,
          hasQr: !!qr,
          lastDisconnect: lastDisconnect?.error?.message || lastDisconnect?.error,
        }, 'Baileys Connection Update');

        if (qr) {
          try {
            const dataUrl = await QRCode.toDataURL(qr, {
              margin: 2,
              scale: 8,
              color: {
                dark: '#0f172a',
                light: '#ffffff',
              },
            });
            this.state.qrCodeDataUrl = dataUrl;
            this.state.status = 'qr_ready';
            this.isInitializing = false;
          } catch (qrErr) {
            console.error('Erro ao gerar QR Code:', qrErr);
          }
        }

        if (connection === 'open') {
          this.state.status = 'connected';
          this.state.qrCodeDataUrl = undefined;
          this.state.lastError = undefined;
          this.state.connectedAt = new Date().toISOString();

          const rawId = sock.user?.id || '';
          const phone = rawId.split(':')[0] || rawId.split('@')[0];
          this.state.connectedPhone = phone ? `+${phone}` : 'Número Conectado';
          this.state.connectedName = sock.user?.name || 'AtendeFlow Bot';
          this.isInitializing = false;
        }

        if (connection === 'close') {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const statusCode = (lastDisconnect?.error as any)?.output?.statusCode;
          const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

          this.isInitializing = false;

          if (statusCode === DisconnectReason.loggedOut) {
            this.state.status = 'disconnected';
            this.state.qrCodeDataUrl = undefined;
            this.state.connectedPhone = undefined;
            this.socket = null;
            if (fs.existsSync(AUTH_DIR)) {
              fs.rmSync(AUTH_DIR, { recursive: true, force: true });
            }
          } else if (shouldReconnect) {
            this.state.status = 'connecting';
            setTimeout(() => {
              this.initSocket().catch((e) => console.error('Falha na reconexão:', e));
            }, 3000);
          } else {
            this.state.status = 'disconnected';
            this.socket = null;
          }
        }
      });

      sock.ev.on('messages.upsert', async ({ messages, type }) => {
        if (type !== 'notify') return;

        for (const msg of messages) {
          await this.handleIncomingMessage(sock, msg);
        }
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao inicializar WhatsApp';
      console.error('Erro no initSocket do WhatsApp:', err);
      this.state.status = 'disconnected';
      this.state.lastError = msg;
      this.isInitializing = false;
    }
  }

  private async handleIncomingMessage(
    sock: WASocket,
    msg: proto.IWebMessageInfo
  ): Promise<void> {
    try {
      if (!msg.message || msg.key.fromMe) return;

      const remoteJid = msg.key.remoteJid;
      // Trava de segurança: NUNCA responde grupos (@g.us), canais (@newsletter) ou transmissões (@broadcast)
      // Permite apenas mensagens privadas individuais (@s.whatsapp.net ou @lid)
      if (
        !remoteJid ||
        remoteJid.endsWith('@g.us') ||
        remoteJid.endsWith('@newsletter') ||
        remoteJid.endsWith('@broadcast') ||
        (!remoteJid.endsWith('@s.whatsapp.net') && !remoteJid.endsWith('@lid'))
      ) {
        return;
      }

      // Deduplicação estrita de ID de mensagem do WhatsApp
      const msgId = msg.key.id;
      if (msgId) {
        if (this.processedMsgIds.has(msgId)) {
          return;
        }
        this.processedMsgIds.add(msgId);
        if (this.processedMsgIds.size > 1000) {
          const oldest = this.processedMsgIds.values().next().value;
          if (oldest) this.processedMsgIds.delete(oldest);
        }
      }

      const text =
        msg.message.conversation ||
        msg.message.extendedTextMessage?.text ||
        msg.message.imageMessage?.caption ||
        '';

      if (!text || text.trim().length === 0) return;

      const rawNumber = remoteJid.replace('@s.whatsapp.net', '').replace('@lid', '');
      const formattedPhone = this.formatPhoneNumber(rawNumber);
      const customerName = msg.pushName || `Contato ${rawNumber.slice(-4)}`;

      // 1. Localiza ou cria a conversa no ConversationStore
      const list = await ConversationStore.list();
      const existing = list.find(
        (c) =>
          c.channel === 'whatsapp' &&
          (c.customerPhone === formattedPhone ||
            c.customerPhone?.replace(/\D/g, '') === rawNumber ||
            c.customerPhone === `+${rawNumber}`)
      );

      let conversationId = existing ? existing.id : '';
      const isHumanMode = existing?.status === 'human';

      if (!existing) {
        const created = await ConversationStore.create({
          customerName,
          customerPhone: formattedPhone,
          channel: 'whatsapp',
          status: 'bot',
        });
        conversationId = created.id;
      }

      // 2. Salva a mensagem recebida do paciente na Inbox imediatamente
      await ConversationStore.addMessage(conversationId, {
        role: 'user',
        senderType: 'customer',
        senderName: customerName,
        content: text.trim(),
      });

      // Se a conversa estiver assumida por um atendente humano ou finalizada, a IA não responde
      if (isHumanMode || existing?.status === 'closed') {
        return;
      }

      // 3. Debounce inteligente (2.5s) para agrupar mensagens consecutivas e nunca responder duplicado
      const existingDebounce = this.pendingDebounce.get(remoteJid);
      if (existingDebounce) {
        clearTimeout(existingDebounce.timeout);
        existingDebounce.texts.push(text.trim());
      } else {
        this.pendingDebounce.set(remoteJid, {
          timeout: setTimeout(() => {}, 0),
          texts: [text.trim()],
          remoteJid,
          customerName,
          conversationId,
          sock,
        });
      }

      const currentBuffer = this.pendingDebounce.get(remoteJid)!;
      currentBuffer.timeout = setTimeout(async () => {
        this.pendingDebounce.delete(remoteJid);
        await this.processDebouncedMessages(currentBuffer);
      }, 2500);
    } catch (err) {
      console.error('Erro ao processar mensagem do WhatsApp:', err);
    }
  }

  private async processDebouncedMessages(entry: {
    texts: string[];
    remoteJid: string;
    customerName: string;
    conversationId: string;
    sock: WASocket;
  }): Promise<void> {
    const { texts, remoteJid, conversationId, sock } = entry;
    try {
      const conv = await ConversationStore.get(conversationId);
      if (!conv || conv.status === 'human' || conv.status === 'closed') {
        return;
      }

      // Mostra presença "digitando..." no WhatsApp
      try {
        await sock.sendPresenceUpdate('composing', remoteJid);
      } catch {}

      // Junta as mensagens consecutivas enviadas (ex: "Tudo ótimo" + "E você?") em uma única pergunta coesa
      const fullQuery = texts.join('\n');

      const history = (conv.messages || []).slice(-8).map((m) => ({
        role: (m.role === 'user' ? 'user' : 'assistant') as 'user' | 'assistant',
        content: m.content,
      }));

      const ragResponse = await processRagQuery(fullQuery, history);

      // Envia uma única resposta no WhatsApp usando o socket ativo mais recente
      const activeSock = this.socket || sock;
      await activeSock.sendMessage(remoteJid, {
        text: ragResponse.answer,
      });
      logger.info({ remoteJid, query: fullQuery, answerLen: ragResponse.answer.length }, 'Sofia IA Respondeu');

      // Salva a resposta da Sofia IA no histórico da Inbox
      await ConversationStore.addMessage(conversationId, {
        role: 'assistant',
        senderType: 'bot',
        senderName: 'Sofia IA',
        content: ragResponse.answer,
        sources: ragResponse.sources,
        handoffTriggered: ragResponse.handoffTriggered,
        handoffReason: ragResponse.handoffReason,
      });

      try {
        await sock.sendPresenceUpdate('paused', remoteJid);
      } catch {}
    } catch (err) {
      console.error('Erro ao processar resposta combinada do WhatsApp:', err);
    }
  }

  private formatPhoneNumber(raw: string): string {
    if (raw.length === 12 || raw.length === 13) {
      // Ex: 5511987654321 -> +55 (11) 98765-4321
      const ddd = raw.slice(2, 4);
      const rest = raw.slice(4);
      if (rest.length === 9) {
        return `+55 (${ddd}) ${rest.slice(0, 5)}-${rest.slice(5)}`;
      }
      return `+55 (${ddd}) ${rest.slice(0, 4)}-${rest.slice(4)}`;
    }
    return `+${raw}`;
  }
}

// Singleton no globalThis para suportar hot-reload no Next.js
const globalForWhatsApp = globalThis as unknown as {
  whatsappManagerInstance: WhatsAppManagerClass | undefined;
};

export const WhatsAppManager =
  globalForWhatsApp.whatsappManagerInstance || new WhatsAppManagerClass();

if (process.env.NODE_ENV !== 'production') {
  globalForWhatsApp.whatsappManagerInstance = WhatsAppManager;
}
