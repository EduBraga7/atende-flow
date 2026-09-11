import React from 'react';
import { User, Bot, AlertTriangle, Layers } from 'lucide-react';
import { SourceReference } from '@/lib/rag/types';
import { ConversationMessage } from '@/lib/conversations/types';

interface MessageBubbleProps {
  msg: ConversationMessage;
  customerName: string;
  onInspectSource: (source: SourceReference) => void;
}

export default function MessageBubble({ msg, customerName, onInspectSource }: MessageBubbleProps) {
  return (
    <div
      className={`flex flex-col ${
        msg.role === 'user' ? 'items-start' : 'items-end'
      }`}
    >
      {/* Identificação do Remetente */}
      <span className="text-[10px] font-semibold text-slate-400 mb-1 px-1 flex items-center gap-1">
        {msg.senderType === 'customer' && (
          <>
            <User className="w-3 h-3 text-slate-500" />
            <span>{customerName}</span>
          </>
        )}
        {msg.senderType === 'bot' && (
          <>
            <Bot className="w-3 h-3 text-indigo-500" />
            <span className="text-indigo-600 font-bold">Sofia IA</span>
          </>
        )}
        {msg.senderType === 'human_agent' && (
          <>
            <User className="w-3 h-3 text-blue-600" />
            <span className="text-blue-700 font-bold">
              {msg.senderName || 'Atendente'}
            </span>
          </>
        )}
        <span>• {msg.timestamp}</span>
      </span>

      {/* Balão da Mensagem */}
      <div
        className={`max-w-[85%] rounded-2xl p-4 text-xs sm:text-sm leading-relaxed shadow-xs ${
          msg.role === 'user'
            ? 'bg-white border border-slate-200 text-slate-900 rounded-tl-xs'
            : msg.senderType === 'bot'
            ? 'bg-gradient-to-tr from-indigo-50 to-purple-50/60 border border-indigo-200 text-indigo-950 rounded-tr-xs'
            : 'bg-blue-600 text-white rounded-tr-xs'
        }`}
      >
        {/* Alerta interno do balão caso tenha acionado transbordo */}
        {msg.handoffTriggered && (
          <div className="mb-2 p-2 rounded-lg bg-amber-100/90 border border-amber-300 text-amber-900 text-[11px] font-semibold flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-700 shrink-0" />
            <span>Gatilho de transbordo acionado nesta mensagem</span>
          </div>
        )}

        <div className="whitespace-pre-wrap">{msg.content}</div>

        {/* Fontes citadas pelo RAG */}
        {msg.sources && msg.sources.length > 0 && (
          <div className="mt-2.5 pt-2 border-t border-indigo-200/60 flex flex-wrap items-center gap-1.5">
            <span className="text-[10px] text-indigo-600 font-semibold flex items-center gap-1">
              <Layers className="w-3 h-3" />
              Fontes:
            </span>
            {msg.sources.map((s, idx) => (
              <button
                key={idx}
                onClick={() => onInspectSource(s)}
                className="text-[10px] bg-white hover:bg-indigo-100 text-indigo-700 font-medium px-2 py-0.5 rounded-md border border-indigo-200 transition-colors inline-flex items-center gap-1 cursor-pointer"
              >
                <span>{s.documentTitle}</span>
                <span className="font-bold text-[9px] text-indigo-900">
                  ({Math.round(s.similarity * 100)}%)
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
