import React, { useRef, useEffect } from 'react';
import { Send, Sparkles, MessageCircle, Pause, Play, CheckCircle2, Trash2, ShieldAlert, Bot, User } from 'lucide-react';
import { Conversation, ConversationStatus, SourceReference } from '@/lib/conversations/types';
import MessageBubble from './MessageBubble';
import { getStatusBadge } from './ConversationList';

export const QUICK_REPLIES = [
  'Olá! Temos horário amanhã às 14h para sua avaliação com a Dra. Camila. Podemos confirmar?',
  'Por favor, venha imediatamente para a clínica na Av. Paulista, 1500. Nosso plantão de emergência está pronto para atender você!',
  'Aceitamos sim o seu convênio para esse procedimento! Você poderia nos enviar foto da sua carteirinha?',
  'O orçamento para esse procedimento pode ser parcelado em até 12x sem juros no cartão ou com 5% de desconto no Pix.',
];

interface ChatWindowProps {
  activeConv: Conversation | null;
  sending: boolean;
  onSendMessage: (text?: string) => void;
  onStatusChange: (status: ConversationStatus) => void;
  onDeleteConversation: (id: string) => void;
  sendMode: 'human' | 'simulate_customer';
  setSendMode: (mode: 'human' | 'simulate_customer') => void;
  inputText: string;
  setInputText: (text: string) => void;
  onInspectSource: (source: SourceReference) => void;
}

export default function ChatWindow({
  activeConv,
  sending,
  onSendMessage,
  onStatusChange,
  onDeleteConversation,
  sendMode,
  setSendMode,
  inputText,
  setInputText,
  onInspectSource,
}: ChatWindowProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeConv?.messages?.length, sending]);

  if (!activeConv) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-400">
        <MessageCircle className="w-16 h-16 mb-3 text-slate-200" />
        <h3 className="font-bold text-slate-700 text-base">
          Nenhuma conversa selecionada
        </h3>
        <p className="text-xs text-slate-500 max-w-sm mt-1">
          Escolha um paciente na lista ao lado para visualizar o histórico completo de mensagens ou responder diretamente.
        </p>
      </div>
    );
  }

  return (
    <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 shadow-xs flex flex-col overflow-hidden h-full">
      {/* Topbar da Conversa Ativa */}
      <div className="p-4 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white font-bold flex items-center justify-center text-sm shadow-xs shrink-0">
            {activeConv.customerName.charAt(0)}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-slate-900 text-sm truncate">
                {activeConv.customerName}
              </h3>
              {getStatusBadge(activeConv.status)}
            </div>
            <p className="text-[11px] text-slate-500 truncate flex items-center gap-2">
              <span>{activeConv.customerPhone || 'Sem telefone'}</span>
              <span>•</span>
              <span className="capitalize">{activeConv.channel}</span>
            </p>
          </div>
        </div>

        {/* Botões de Ação de Transbordo / Controle */}
        <div className="flex items-center gap-2 shrink-0">
          {activeConv.status === 'bot' && (
            <button
              onClick={() => onStatusChange('human')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-rose-50 text-slate-700 hover:text-rose-700 border border-slate-200 hover:border-rose-200 text-xs font-semibold rounded-xl transition-all cursor-pointer shadow-2xs"
              title="Pausar a IA e assumir o atendimento manualmente"
            >
              <Pause className="w-3.5 h-3.5 text-slate-500" />
              <span>Pausar IA (Assumir)</span>
            </button>
          )}

          {activeConv.status === 'human' && (
            <button
              onClick={() => onStatusChange('bot')}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer"
              title="Reativar respostas automáticas da Sofia IA no WhatsApp"
            >
              <Play className="w-3.5 h-3.5" />
              <span>Ligar Sofia IA</span>
            </button>
          )}

          {activeConv.status === 'waiting_human' && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => onStatusChange('human')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors cursor-pointer"
                title="Assumir o atendimento"
              >
                <User className="w-3.5 h-3.5" />
                <span>Assumir Atendimento</span>
              </button>
              <button
                onClick={() => onStatusChange('bot')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
                title="Devolver para a Sofia IA"
              >
                <Bot className="w-3.5 h-3.5" />
                <span>Devolver p/ IA</span>
              </button>
            </div>
          )}

          {activeConv.status !== 'closed' ? (
            <button
              onClick={() => onStatusChange('closed')}
              className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              title="Finalizar atendimento"
            >
              <CheckCircle2 className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={() => onStatusChange('bot')}
              className="text-xs px-2.5 py-1.5 text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
            >
              Reabrir
            </button>
          )}

          <button
            onClick={() => onDeleteConversation(activeConv.id)}
            className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
            title="Excluir histórico"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Banner de Urgência / Transbordo Ativo */}
      {activeConv.status === 'waiting_human' && (
        <div className="bg-gradient-to-r from-rose-50 to-amber-50 border-b border-rose-200 p-3.5 flex items-start gap-3 shrink-0">
          <div className="p-2 bg-rose-100 text-rose-700 rounded-xl shrink-0">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div className="flex-1 text-xs">
            <h4 className="font-bold text-rose-900 text-xs">
              Transbordo Humano Solicitado pela IA
            </h4>
            <p className="text-rose-700 mt-0.5">
              {activeConv.handoffReason ||
                'O paciente solicitou atendimento com um atendente humano ou relatou emergência.'}
            </p>
          </div>
          <button
            onClick={() => onStatusChange('human')}
            className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors shrink-0 cursor-pointer"
          >
            Atender Agora
          </button>
        </div>
      )}

      {/* Histórico de Mensagens */}
      <div className="flex-1 p-5 overflow-y-auto space-y-4 bg-slate-50/40 min-h-0">
        {activeConv.messages.map((msg) => (
          <MessageBubble
            key={msg.id}
            msg={msg}
            customerName={activeConv.customerName}
            onInspectSource={onInspectSource}
          />
        ))}

        {sending && (
          <div className="flex items-center gap-2 text-xs text-slate-500 italic p-2">
            <Sparkles className="w-3.5 h-3.5 text-blue-600 animate-spin" />
            <span>Enviando mensagem e processando resposta...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Respostas Rápidas de Consultório */}
      <div className="px-4 py-2 bg-white border-t border-slate-100 flex items-center gap-1.5 overflow-x-auto text-xs shrink-0">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider shrink-0">
          Atalhos:
        </span>
        {QUICK_REPLIES.map((reply, i) => (
          <button
            key={i}
            onClick={() => onSendMessage(reply)}
            disabled={sending}
            className="px-2.5 py-1 bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-700 rounded-lg text-[11px] whitespace-nowrap transition-colors border border-slate-200 shrink-0 cursor-pointer"
          >
            {reply.slice(0, 38)}...
          </button>
        ))}
      </div>

      {/* Rodapé de Envio */}
      <div className="p-4 bg-white border-t border-slate-200 space-y-2 shrink-0">
        <div className="flex items-center justify-between text-xs px-1">
          <div className="flex items-center gap-2">
            {activeConv.status === 'bot' ? (
              <div className="flex items-center gap-1.5 text-emerald-700 font-semibold text-xs">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>Sofia IA respondendo automaticamente neste WhatsApp</span>
              </div>
            ) : activeConv.status === 'waiting_human' ? (
              <div className="flex items-center gap-1.5 text-rose-700 font-semibold text-xs">
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                <span>Transbordo solicitado: paciente aguardando atendente</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-blue-700 font-semibold text-xs">
                <span className="w-2 h-2 rounded-full bg-blue-500" />
                <span>Atendimento manual: Sofia IA pausada nesta conversa</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
            <span>Modo:</span>
            <select
              value={sendMode}
              onChange={(e) => setSendMode(e.target.value as 'human' | 'simulate_customer')}
              className="text-[11px] bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg px-2 py-0.5 text-slate-700 font-medium focus:outline-hidden cursor-pointer"
            >
              <option value="human">👤 Secretária / Clínica (WhatsApp)</option>
              <option value="simulate_customer">🧪 Teste: Simular Pergunta do Paciente</option>
            </select>
          </div>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSendMessage();
          }}
          className="flex items-center gap-2"
        >
          <input
            type="text"
            placeholder={
              sendMode === 'human'
                ? 'Digite uma mensagem para enviar via WhatsApp para o paciente...'
                : 'Simule uma dúvida enviada pelo paciente para testar a Sofia IA...'
            }
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            disabled={sending}
            className="flex-1 px-4 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-500 shadow-2xs"
          />
          <button
            type="submit"
            disabled={sending || !inputText.trim()}
            className="p-2.5 sm:px-4 sm:py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl shadow-xs transition-colors disabled:opacity-50 inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Send className="w-4 h-4" />
            <span className="hidden sm:inline">Enviar</span>
          </button>
        </form>
      </div>
    </div>
  );
}
