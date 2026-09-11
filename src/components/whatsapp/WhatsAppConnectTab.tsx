'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Smartphone,
  QrCode,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Send,
  LogOut,
  Sparkles,
  PhoneCall,
  Check,
  Zap,
} from 'lucide-react';
import { WhatsAppState } from '@/lib/whatsapp/types';

interface WhatsAppConnectTabProps {
  onStatusChange?: (connected: boolean) => void;
}

export default function WhatsAppConnectTab({ onStatusChange }: WhatsAppConnectTabProps) {
  const [state, setState] = useState<WhatsAppState>({
    status: 'disconnected',
  });
  const [loading, setLoading] = useState(false);
  const [testPhone, setTestPhone] = useState('');
  const [testMessage, setTestMessage] = useState(
    'Olá! Esta é uma mensagem de teste enviada pelo AtendeFlow via WhatsApp oficial.'
  );
  const [testSending, setTestSending] = useState(false);
  const [testResult, setTestResult] = useState<{
    success?: boolean;
    error?: string;
  } | null>(null);

  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchStatus = async () => {
    try {
      const res = await fetch('/api/whatsapp/status');
      const data: WhatsAppState = await res.json();
      setState(data);

      if (onStatusChange) {
        onStatusChange(data.status === 'connected');
      }
    } catch (err) {
      console.error('Erro ao buscar status do WhatsApp:', err);
    }
  };

  useEffect(() => {
    fetchStatus();

    // Inicia polling se estiver aguardando QR ou conectando
    pollIntervalRef.current = setInterval(() => {
      fetchStatus();
    }, 2000);

    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleStartConnect = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/whatsapp/connect', { method: 'POST' });
      const data = await res.json();
      if (data.state) {
        setState(data.state);
      }
    } catch (err) {
      console.error('Falha ao iniciar conexão:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm('Deseja realmente desconectar seu número de WhatsApp?')) return;
    setLoading(true);
    try {
      await fetch('/api/whatsapp/disconnect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clearSession: true }),
      });
      await fetchStatus();
    } catch (err) {
      console.error('Falha ao desconectar:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSendTestMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testPhone.trim() || !testMessage.trim()) return;

    setTestSending(true);
    setTestResult(null);

    try {
      const res = await fetch('/api/whatsapp/send-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: testPhone.trim(),
          message: testMessage.trim(),
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setTestResult({ success: true });
        setTimeout(() => setTestResult(null), 5000);
      } else {
        setTestResult({ error: data.error || 'Falha ao enviar mensagem.' });
      }
    } catch {
      setTestResult({ error: 'Erro de rede ao enviar teste.' });
    } finally {
      setTestSending(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Banner de Apresentação */}
      <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white rounded-3xl p-6 sm:p-8 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-2 max-w-xl">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-xs font-bold text-white border border-white/30">
            <Zap className="w-3.5 h-3.5 text-yellow-300" />
            <span>Conexão Direta e Oficial com WhatsApp Web</span>
          </div>
          <h2 className="text-2xl font-black tracking-tight">
            Conecte seu WhatsApp via QR Code
          </h2>
          <p className="text-xs sm:text-sm text-emerald-100 leading-relaxed">
            Pareie o WhatsApp do seu consultório ou empresa. A <strong>Sofia IA</strong> responderá seus pacientes automaticamente usando a base de conhecimento RAG, e você poderá intervir a qualquer momento pela Inbox!
          </p>
        </div>

        <div className="shrink-0 flex items-center gap-3">
          <div className="w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-white">
            <Smartphone className="w-8 h-8" />
          </div>
        </div>
      </div>

      {/* Grid Principal: QR Code + Instruções ou Card de Conectado */}
      {state.status === 'connected' ? (
        /* Estado: CONECTADO COM SUCESSO */
        <div className="bg-white rounded-3xl border border-emerald-200 p-8 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center shadow-xs">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold text-slate-900">
                    WhatsApp Conectado com Sucesso!
                  </h3>
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-xs border border-emerald-200 flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    Online
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-2">
                  <span className="font-semibold text-slate-800">
                    {state.connectedPhone || 'Número Ativo'}
                  </span>
                  <span>•</span>
                  <span>{state.connectedName || 'AtendeFlow Bot'}</span>
                  {state.connectedAt && (
                    <>
                      <span>•</span>
                      <span>
                        Desde{' '}
                        {new Date(state.connectedAt).toLocaleTimeString('pt-BR', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </>
                  )}
                </p>
              </div>
            </div>

            <button
              onClick={handleDisconnect}
              disabled={loading}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-xl border border-rose-200 transition-colors disabled:opacity-50 cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span>Desconectar Aparelho</span>
            </button>
          </div>

          {/* Destaque das Funcionalidades Ativas */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-1">
              <span className="font-bold text-slate-900 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-emerald-600" />
                Respostas Automáticas
              </span>
              <p className="text-slate-600">
                A Sofia IA responde dúvidas com base na sua documentação RAG 24 horas por dia.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-1">
              <span className="font-bold text-slate-900 flex items-center gap-1.5">
                <PhoneCall className="w-4 h-4 text-blue-600" />
                Inbox Centralizada
              </span>
              <p className="text-slate-600">
                Todas as conversas que chegarem caem na Central de Atendimento para a secretária.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-1">
              <span className="font-bold text-slate-900 flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 text-amber-600" />
                Transbordo Humano
              </span>
              <p className="text-slate-600">
                Urgências clínicas e pedidos de agendamento são sinalizados como prioritários.
              </p>
            </div>
          </div>

          {/* Teste de Envio de Mensagem Real */}
          <div className="p-6 rounded-2xl bg-slate-50/70 border border-slate-200 space-y-4">
            <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Send className="w-4 h-4 text-emerald-600" />
              Enviar Mensagem de Teste para um Celular
            </h4>
            <p className="text-xs text-slate-600">
              Teste o envio enviando uma mensagem para o seu próprio número ou de um colega.
            </p>

            <form onSubmit={handleSendTestMessage} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-1">
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Número do Destinatário (com DDD)
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: 11987654321"
                    value={testPhone}
                    onChange={(e) => setTestPhone(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Texto da Mensagem
                  </label>
                  <input
                    type="text"
                    value={testMessage}
                    onChange={(e) => setTestMessage(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                {testResult?.success && (
                  <span className="text-xs font-bold text-emerald-700 flex items-center gap-1">
                    <Check className="w-4 h-4 text-emerald-600" />
                    Mensagem de teste enviada com sucesso!
                  </span>
                )}
                {testResult?.error && (
                  <span className="text-xs font-bold text-rose-700 flex items-center gap-1">
                    <AlertCircle className="w-4 h-4 text-rose-600" />
                    {testResult.error}
                  </span>
                )}
                {!testResult && <span></span>}

                <button
                  type="submit"
                  disabled={testSending || !testPhone.trim()}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors disabled:opacity-50 inline-flex items-center gap-1.5 cursor-pointer ml-auto"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{testSending ? 'Disparando...' : 'Enviar Teste'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : (
        /* Estado: DESCONECTADO ou AGUARDANDO LEITURA DO QR CODE */
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
          {/* Coluna Esquerda: Área do QR Code (5 cols) */}
          <div className="md:col-span-5 bg-white p-6 rounded-3xl border border-slate-200 shadow-xs flex flex-col items-center justify-center text-center space-y-4 min-h-[420px]">
            {state.status === 'qr_ready' && state.qrCodeDataUrl ? (
              <div className="space-y-4 animate-in fade-in zoom-in duration-300">
                <div className="p-3 bg-slate-50 border-2 border-emerald-500/80 rounded-2xl shadow-inner inline-block relative group">
                  {/* Imagem do QR Code Oficial */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={state.qrCodeDataUrl}
                    alt="WhatsApp QR Code"
                    className="w-64 h-64 rounded-xl object-contain mx-auto"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-emerald-700">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                    <span>QR Code Pronto para Leitura!</span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Aponte a câmera do seu WhatsApp agora
                  </p>
                </div>

                <button
                  onClick={handleStartConnect}
                  disabled={loading}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 p-2 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                  <span>Atualizar QR Code</span>
                </button>
              </div>
            ) : state.status === 'connecting' ? (
              <div className="space-y-3 p-8">
                <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto animate-spin">
                  <RefreshCw className="w-8 h-8" />
                </div>
                <h4 className="font-bold text-slate-900 text-sm">
                  Iniciando conexão com WhatsApp...
                </h4>
                <p className="text-xs text-slate-500 max-w-xs">
                  Aguarde alguns segundos enquanto geramos seu QR Code exclusivo.
                </p>
              </div>
            ) : (
              <div className="space-y-4 p-8">
                <div className="w-20 h-20 rounded-3xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                  <QrCode className="w-10 h-10" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">
                    Nenhum WhatsApp Conectado
                  </h4>
                  <p className="text-xs text-slate-500 mt-1 max-w-xs">
                    Clique no botão abaixo para gerar o QR Code oficial e conectar seu número.
                  </p>
                </div>

                <button
                  onClick={handleStartConnect}
                  disabled={loading}
                  className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors disabled:opacity-50 inline-flex items-center gap-2 cursor-pointer"
                >
                  <QrCode className="w-4 h-4" />
                  <span>{loading ? 'Gerando QR Code...' : 'Gerar QR Code Agora'}</span>
                </button>
              </div>
            )}
          </div>

          {/* Coluna Direita: Passo a Passo Ilustrado (7 cols) */}
          <div className="md:col-span-7 bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-xs space-y-6">
            <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
              <Smartphone className="w-5 h-5 text-emerald-600" />
              Como conectar seu celular em 4 passos:
            </h3>

            <div className="space-y-4">
              <div className="flex items-start gap-3.5 p-3 rounded-2xl hover:bg-slate-50 transition-colors">
                <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 font-black text-xs flex items-center justify-center shrink-0">
                  1
                </div>
                <div className="text-xs">
                  <p className="font-bold text-slate-900">Abra o WhatsApp no seu celular</p>
                  <p className="text-slate-500 mt-0.5">
                    Certifique-se de estar conectado à internet.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3.5 p-3 rounded-2xl hover:bg-slate-50 transition-colors">
                <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 font-black text-xs flex items-center justify-center shrink-0">
                  2
                </div>
                <div className="text-xs">
                  <p className="font-bold text-slate-900">Acesse o menu de aparelhos</p>
                  <p className="text-slate-500 mt-0.5">
                    No <strong>Android</strong>, toque nos 3 pontinhos no canto superior direito. No <strong>iPhone</strong>, toque na aba <strong>Configurações</strong> no rodapé.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3.5 p-3 rounded-2xl hover:bg-slate-50 transition-colors">
                <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 font-black text-xs flex items-center justify-center shrink-0">
                  3
                </div>
                <div className="text-xs">
                  <p className="font-bold text-slate-900">Selecione &ldquo;Aparelhos conectados&rdquo;</p>
                  <p className="text-slate-500 mt-0.5">
                    Toque no botão verde <strong>&ldquo;Conectar um aparelho&rdquo;</strong>.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3.5 p-3 rounded-2xl hover:bg-slate-50 transition-colors">
                <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 font-black text-xs flex items-center justify-center shrink-0">
                  4
                </div>
                <div className="text-xs">
                  <p className="font-bold text-slate-900">Aponte a câmera para o QR Code</p>
                  <p className="text-slate-500 mt-0.5">
                    Mantenha a câmera apontada para o código na tela ao lado. Em poucos segundos a conexão será confirmada automaticamente!
                  </p>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>
                <strong>Privacidade e Segurança:</strong> A conexão é direta ponto-a-ponto via WebSocket criptografado. Nenhuma empresa externa tem acesso às suas conversas.
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
