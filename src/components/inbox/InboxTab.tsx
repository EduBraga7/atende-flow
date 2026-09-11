'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Layers, Phone, Globe } from 'lucide-react';
import {
  Conversation,
  ConversationStatus,
  ConversationStats,
  SourceReference,
} from '@/lib/conversations/types';
import ConversationList from './ConversationList';
import ChatWindow from './ChatWindow';

export default function InboxTab() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem('atendeflow_selected_conv');
    }
    return null;
  });
  const [activeConv, setActiveConv] = useState<Conversation | null>(null);
  const [stats, setStats] = useState<ConversationStats>({
    total: 0,
    bot: 0,
    waiting_human: 0,
    human: 0,
    closed: 0,
  });

  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [inputText, setInputText] = useState('');
  const [sendMode, setSendMode] = useState<'human' | 'simulate_customer'>('human');
  const [sending, setSending] = useState(false);
  const [newChatModal, setNewChatModal] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState('');
  const [newCustomerPhone, setNewCustomerPhone] = useState('');
  const [newCustomerChannel, setNewCustomerChannel] = useState<'whatsapp' | 'web'>('whatsapp');
  const [newCustomerMsg, setNewCustomerMsg] = useState('');
  const [inspectSource, setInspectSource] = useState<SourceReference | null>(null);

  const selectedIdRef = useRef<string | null>(null);

  useEffect(() => {
    selectedIdRef.current = selectedId;
  }, [selectedId]);

  const fetchConversations = async (keepSelection = true) => {
    try {
      let url = '/api/conversations?';
      if (filterStatus !== 'all') {
        url += `status=${filterStatus}&`;
      }
      if (searchQuery.trim()) {
        url += `search=${encodeURIComponent(searchQuery.trim())}&`;
      }

      const res = await fetch(url);
      const data = await res.json();
      if (res.ok) {
        setConversations(data.conversations || []);
        setStats(data.stats || { total: 0, bot: 0, waiting_human: 0, human: 0, closed: 0 });

        if (data.conversations?.length > 0) {
          const currentId = selectedId || (typeof window !== 'undefined' ? sessionStorage.getItem('atendeflow_selected_conv') : null);
          const found = currentId ? data.conversations.find((c: Conversation) => c.id === currentId) : null;
          if (found) {
            if (!activeConv || activeConv.id !== found.id) {
              selectConversation(found.id);
            }
          } else if (!keepSelection || !selectedId) {
            selectConversation(data.conversations[0].id);
          }
        }
      }
    } catch (err) {
      console.error('Erro ao carregar conversas:', err);
    }
  };

  const selectConversation = async (id: string) => {
    setSelectedId(id);
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('atendeflow_selected_conv', id);
    }
    try {
      const res = await fetch(`/api/conversations/${id}`);
      const data = await res.json();
      if (res.ok && data.conversation) {
        setActiveConv(data.conversation);
        setConversations((prev) =>
          prev.map((c) => (c.id === id ? { ...c, unreadCount: 0 } : c))
        );
      }
    } catch (err) {
      console.error('Erro ao abrir conversa:', err);
    }
  };

  const refreshActiveConversation = async (id: string) => {
    try {
      const res = await fetch(`/api/conversations/${id}`);
      const data = await res.json();
      if (res.ok && data.conversation) {
        setActiveConv((prev) => {
          if (
            !prev ||
            prev.id !== data.conversation.id ||
            prev.messages.length !== data.conversation.messages.length ||
            prev.status !== data.conversation.status
          ) {
            return data.conversation;
          }
          return prev;
        });
      }
    } catch (err) {
      console.error('Erro ao atualizar conversa ativa:', err);
    }
  };

  useEffect(() => {
    const interval = setInterval(() => {
      fetchConversations(true);
      if (selectedIdRef.current) {
        refreshActiveConversation(selectedIdRef.current);
      }
    }, 2000);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetchConversations(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterStatus]);

  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      fetchConversations(true);
    }, 300);
    return () => clearTimeout(delayDebounce);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery]);

  const handleSendMessage = async (customContent?: string) => {
    const text = (customContent || inputText).trim();
    if (!text || !activeConv || sending) return;

    setSending(true);
    setInputText('');

    try {
      const senderType = sendMode === 'human' ? 'human_agent' : 'customer';
      const senderName = sendMode === 'human' ? 'Patrícia (Recepção)' : activeConv.customerName;

      const res = await fetch(`/api/conversations/${activeConv.id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: text,
          senderType,
          senderName,
        }),
      });

      const data = await res.json();
      if (res.ok && data.conversation) {
        setActiveConv(data.conversation);
        setConversations((prev) =>
          prev.map((c) => (c.id === data.conversation.id ? data.conversation : c))
        );
        fetchConversations(true);
      }
    } catch (err) {
      console.error('Erro ao enviar mensagem:', err);
    } finally {
      setSending(false);
    }
  };

  const handleStatusChange = async (newStatus: ConversationStatus) => {
    if (!activeConv) return;
    try {
      const res = await fetch(`/api/conversations/${activeConv.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (res.ok && data.conversation) {
        setActiveConv(data.conversation);
        fetchConversations(true);
      }
    } catch (err) {
      console.error('Erro ao mudar status:', err);
    }
  };

  const handleDeleteConversation = async (id: string) => {
    if (!confirm('Deseja realmente excluir esta conversa?')) return;
    try {
      const res = await fetch(`/api/conversations/${id}`, { method: 'DELETE' });
      if (res.ok) {
        if (selectedId === id) {
          setSelectedId(null);
          setActiveConv(null);
        }
        fetchConversations(false);
      }
    } catch (err) {
      console.error('Erro ao excluir:', err);
    }
  };

  const handleCreateNewChat = async () => {
    if (!newCustomerName.trim() || !newCustomerMsg.trim()) {
      alert('Preencha o nome do paciente e a mensagem inicial.');
      return;
    }

    try {
      const createRes = await fetch('/api/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName: newCustomerName.trim(),
          customerPhone: newCustomerPhone.trim() || '(11) 99999-0000',
          channel: newCustomerChannel,
          status: 'bot',
        }),
      });
      const createData = await createRes.json();

      if (createRes.ok && createData.conversation) {
        const msgRes = await fetch(
          `/api/conversations/${createData.conversation.id}/messages`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              content: newCustomerMsg.trim(),
              senderType: 'customer',
              senderName: newCustomerName.trim(),
            }),
          }
        );
        const msgData = await msgRes.json();

        setNewChatModal(false);
        setNewCustomerName('');
        setNewCustomerPhone('');
        setNewCustomerMsg('');

        await fetchConversations(true);
        if (msgData.conversation) {
          setActiveConv(msgData.conversation);
          setSelectedId(msgData.conversation.id);
        }
      }
    } catch (err) {
      console.error('Erro ao criar chat:', err);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 h-[800px] items-stretch">
      <ConversationList
        conversations={conversations}
        stats={stats}
        selectedId={selectedId}
        onSelect={selectConversation}
        filterStatus={filterStatus}
        setFilterStatus={setFilterStatus}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        onNewChatClick={() => setNewChatModal(true)}
      />

      <ChatWindow
        activeConv={activeConv}
        sending={sending}
        onSendMessage={handleSendMessage}
        onStatusChange={handleStatusChange}
        onDeleteConversation={handleDeleteConversation}
        sendMode={sendMode}
        setSendMode={setSendMode}
        inputText={inputText}
        setInputText={setInputText}
        onInspectSource={setInspectSource}
      />

      {/* Modal Inspecionar Trecho RAG */}
      {inspectSource && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Layers className="w-4 h-4 text-indigo-600" />
                Fonte Citada pela IA
              </h3>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                {Math.round(inspectSource.similarity * 100)}% Relevância
              </span>
            </div>

            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase mb-1">
                Documento
              </p>
              <p className="text-sm font-bold text-slate-900">
                {inspectSource.documentTitle}
              </p>
            </div>

            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase mb-1">
                Trecho Literal Utilizado
              </p>
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-mono leading-relaxed max-h-56 overflow-y-auto">
                &ldquo;{inspectSource.content}&rdquo;
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setInspectSource(null)}
                className="px-4 py-2 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Nova Conversa de Teste */}
      {newChatModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-md w-full p-6 space-y-4">
            <h3 className="text-base font-bold text-slate-900">
              Iniciar Novo Teste de Atendimento
            </h3>
            <p className="text-xs text-slate-600">
              Simule um novo paciente entrando em contato por WhatsApp ou pelo site.
            </p>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Nome do Paciente
                </label>
                <input
                  type="text"
                  placeholder="Ex: Beatriz Lima"
                  value={newCustomerName}
                  onChange={(e) => setNewCustomerName(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Telefone / WhatsApp
                </label>
                <input
                  type="text"
                  placeholder="(11) 98888-7777"
                  value={newCustomerPhone}
                  onChange={(e) => setNewCustomerPhone(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Canal
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setNewCustomerChannel('whatsapp')}
                    className={`px-3 py-2 rounded-xl text-xs font-bold border transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
                      newCustomerChannel === 'whatsapp'
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-700'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <Phone className="w-3.5 h-3.5" />
                    <span>WhatsApp</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewCustomerChannel('web')}
                    className={`px-3 py-2 rounded-xl text-xs font-bold border transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
                      newCustomerChannel === 'web'
                        ? 'bg-blue-50 border-blue-500 text-blue-700'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <Globe className="w-3.5 h-3.5" />
                    <span>Site / Web</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Primeira Mensagem do Paciente
                </label>
                <textarea
                  rows={3}
                  placeholder="Ex: Quanto custa a limpeza dental e aceita Amil?"
                  value={newCustomerMsg}
                  onChange={(e) => setNewCustomerMsg(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setNewChatModal(false)}
                className="px-4 py-2 text-xs text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreateNewChat}
                className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                Iniciar Conversa
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
