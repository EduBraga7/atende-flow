import React from 'react';
import { Search, Plus, Phone, Globe, AlertTriangle, User, Bot, CheckCircle2, MessageCircle } from 'lucide-react';
import { Conversation, ConversationStatus, ConversationStats } from '@/lib/conversations/types';

interface ConversationListProps {
  conversations: Conversation[];
  stats: ConversationStats;
  selectedId: string | null;
  onSelect: (id: string) => void;
  filterStatus: string;
  setFilterStatus: (status: string) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  onNewChatClick: () => void;
}

export function getStatusBadge(status: ConversationStatus) {
  switch (status) {
    case 'waiting_human':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" />
          <AlertTriangle className="w-3 h-3 text-rose-600" />
          <span>Aguardando Humano</span>
        </span>
      );
    case 'human':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
          <User className="w-3 h-3 text-blue-600" />
          <span>Atendimento Manual</span>
        </span>
      );
    case 'bot':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <Bot className="w-3 h-3 text-emerald-600" />
          <span>Sofia IA Ativa</span>
        </span>
      );
    case 'closed':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
          <CheckCircle2 className="w-3 h-3 text-slate-500" />
          <span>Finalizado</span>
        </span>
      );
  }
}

export default function ConversationList({
  conversations,
  stats,
  selectedId,
  onSelect,
  filterStatus,
  setFilterStatus,
  searchQuery,
  setSearchQuery,
  onNewChatClick,
}: ConversationListProps) {
  return (
    <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 shadow-xs flex flex-col overflow-hidden">
      {/* Top Header da Lista */}
      <div className="p-4 border-b border-slate-100 space-y-3 bg-slate-50/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="font-black text-base text-slate-900">
              Caixa de Entrada
            </h2>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
              {stats.total}
            </span>
          </div>

          <button
            onClick={onNewChatClick}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Novo Teste</span>
          </button>
        </div>

        {/* Barra de Busca */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Buscar paciente ou mensagem..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Filtros por Status */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          <button
            onClick={() => setFilterStatus('all')}
            className={`px-2.5 py-1 rounded-lg font-semibold whitespace-nowrap transition-colors cursor-pointer ${
              filterStatus === 'all'
                ? 'bg-slate-900 text-white'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
            }`}
          >
            Todos ({stats.total})
          </button>

          <button
            onClick={() => setFilterStatus('waiting_human')}
            className={`px-2.5 py-1 rounded-lg font-semibold whitespace-nowrap transition-colors cursor-pointer flex items-center gap-1 ${
              filterStatus === 'waiting_human'
                ? 'bg-rose-600 text-white'
                : 'bg-white border border-rose-200 text-rose-700 hover:bg-rose-50'
            }`}
          >
            <span>🚨 Aguardando</span>
            {stats.waiting_human > 0 && (
              <span className="w-4 h-4 rounded-full bg-rose-500 text-white text-[10px] flex items-center justify-center font-bold">
                {stats.waiting_human}
              </span>
            )}
          </button>

          <button
            onClick={() => setFilterStatus('bot')}
            className={`px-2.5 py-1 rounded-lg font-semibold whitespace-nowrap transition-colors cursor-pointer ${
              filterStatus === 'bot'
                ? 'bg-emerald-600 text-white'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
            }`}
          >
            🤖 IA ({stats.bot})
          </button>

          <button
            onClick={() => setFilterStatus('human')}
            className={`px-2.5 py-1 rounded-lg font-semibold whitespace-nowrap transition-colors cursor-pointer ${
              filterStatus === 'human'
                ? 'bg-blue-600 text-white'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
            }`}
          >
            👤 Humano ({stats.human})
          </button>
        </div>
      </div>

      {/* Lista Scrollável */}
      <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
        {conversations.length === 0 ? (
          <div className="p-10 text-center text-slate-400 text-xs">
            <MessageCircle className="w-10 h-10 mx-auto mb-2 opacity-40" />
            <p className="font-medium text-slate-600">Nenhuma conversa encontrada</p>
            <p className="mt-1">Tente mudar o filtro ou crie um novo teste.</p>
          </div>
        ) : (
          conversations.map((conv) => (
            <div
              key={conv.id}
              onClick={() => onSelect(conv.id)}
              className={`p-4 transition-all cursor-pointer flex items-start gap-3 relative ${
                selectedId === conv.id
                  ? 'bg-blue-50/70 border-l-4 border-blue-600'
                  : 'hover:bg-slate-50'
              }`}
            >
              {/* Avatar com Canal */}
              <div className="relative shrink-0">
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-slate-200 to-slate-100 text-slate-700 font-bold flex items-center justify-center text-sm shadow-2xs">
                  {conv.customerName.charAt(0)}
                </div>
                <span
                  className={`absolute -bottom-1 -right-1 p-0.5 rounded-full border-2 border-white text-white ${
                    conv.channel === 'whatsapp' ? 'bg-emerald-500' : 'bg-blue-500'
                  }`}
                >
                  {conv.channel === 'whatsapp' ? (
                    <Phone className="w-2.5 h-2.5" />
                  ) : (
                    <Globe className="w-2.5 h-2.5" />
                  )}
                </span>
              </div>

              {/* Conteúdo */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1 mb-1">
                  <h4 className="text-xs font-bold text-slate-900 truncate">
                    {conv.customerName}
                  </h4>
                  <span className="text-[10px] text-slate-400 shrink-0">
                    {new Date(conv.lastMessageAt).toLocaleTimeString('pt-BR', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>

                <p className="text-xs text-slate-600 truncate mb-1.5 leading-snug">
                  {conv.lastMessage || 'Sem mensagens'}
                </p>

                <div className="flex items-center justify-between gap-2">
                  {getStatusBadge(conv.status)}

                  {conv.unreadCount > 0 && (
                    <span className="px-1.5 py-0.5 rounded-full bg-blue-600 text-white font-bold text-[10px]">
                      {conv.unreadCount} nova(s)
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
