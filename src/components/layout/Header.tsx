import React from 'react';
import {
  Inbox,
  MessageSquare,
  BookOpen,
  Settings,
  Sparkles,
  Building2,
  AlertTriangle,
  QrCode,
} from 'lucide-react';

export type TabType = 'inbox' | 'whatsapp' | 'knowledge' | 'settings';

interface HeaderProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  businessName: string;
  pendingHandoffs: number;
  whatsappConnected: boolean;
}

export default function Header({
  activeTab,
  setActiveTab,
  businessName,
  pendingHandoffs,
  whatsappConnected,
}: HeaderProps) {
  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200/80 backdrop-blur-md bg-white/90">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo e Nome */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-sky-500 flex items-center justify-center text-white shadow-xs">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-black tracking-tight text-slate-900">
                  Atende<span className="text-blue-600">Flow</span>
                </h1>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                  SaaS v2.0
                </span>
              </div>
              <p className="text-xs text-slate-500 hidden sm:block">
                Central Omnichannel com RAG & Transbordo Humano
              </p>
            </div>
          </div>

          {/* Negócio Ativo */}
          <div className="flex items-center gap-2.5">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium text-slate-700">
              <Building2 className="w-4 h-4 text-slate-500" />
              <span className="truncate max-w-[200px] font-semibold text-slate-800">
                {businessName}
              </span>
            </div>

            {/* Status do WhatsApp no Topbar */}
            <button
              onClick={() => setActiveTab('whatsapp')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                whatsappConnected
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                  : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
              }`}
              title="Status da conexão WhatsApp"
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  whatsappConnected ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'
                }`}
              ></span>
              <span>{whatsappConnected ? 'WhatsApp Online' : 'Conectar WhatsApp'}</span>
            </button>
          </div>
        </div>

        {/* Abas de Navegação */}
        <div className="flex gap-2 -mb-px pt-1 border-t border-slate-100">
          <button
            onClick={() => setActiveTab('inbox')}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-all cursor-pointer ${
              activeTab === 'inbox'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
            }`}
          >
            <Inbox className="w-4 h-4" />
            <span>Central de Atendimento</span>
            {pendingHandoffs > 0 && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-rose-500 text-white text-[10px] font-bold animate-pulse">
                <AlertTriangle className="w-3 h-3" />
                {pendingHandoffs}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('whatsapp')}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-all cursor-pointer ${
              activeTab === 'whatsapp'
                ? 'border-emerald-600 text-emerald-600'
                : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
            }`}
          >
            <QrCode className="w-4 h-4" />
            <span>Conectar WhatsApp (QR Code)</span>
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                whatsappConnected ? 'bg-emerald-500' : 'bg-slate-300'
              }`}
            ></span>
          </button>



          <button
            onClick={() => setActiveTab('knowledge')}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-all cursor-pointer ${
              activeTab === 'knowledge'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>Base de Conhecimento</span>
          </button>

          <button
            onClick={() => setActiveTab('settings')}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-all cursor-pointer ${
              activeTab === 'settings'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
            }`}
          >
            <Settings className="w-4 h-4" />
            <span>Configurações & Persona</span>
          </button>
        </div>
      </div>
    </header>
  );
}
