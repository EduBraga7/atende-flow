'use client';

import React, { useState, useEffect } from 'react';
import {
  Bot,
  Sliders,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  Plus,
  X,
  Sparkles,
} from 'lucide-react';
import { BotConfig } from '@/lib/rag/types';

interface SettingsTabProps {
  onConfigUpdated?: (businessName: string) => void;
}

export default function SettingsTab({ onConfigUpdated }: SettingsTabProps) {
  const [config, setConfig] = useState<BotConfig>({
    businessName: '',
    systemPrompt: '',
    temperature: 0.3,
    handoffKeywords: [],
    similarityThreshold: 0.2,
    maxChunks: 5,
  });
  const [newKeyword, setNewKeyword] = useState('');
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const fetchConfig = async () => {
    try {
      const res = await fetch('/api/config');
      const data = await res.json();
      if (res.ok) {
        setConfig({
          businessName: data.businessName || '',
          systemPrompt: data.systemPrompt || '',
          temperature: data.temperature ?? 0.3,
          handoffKeywords: data.handoffKeywords || [],
          similarityThreshold: data.similarityThreshold ?? 0.2,
          maxChunks: data.maxChunks ?? 5,
        });
      }
    } catch (err) {
      console.error('Falha ao carregar configuração', err);
    }
  };

  useEffect(() => {
    fetchConfig();
  }, []);

  const showNotice = (type: 'success' | 'error', message: string) => {
    setNotice({ type, message });
    setTimeout(() => setNotice(null), 5000);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload: Partial<BotConfig> = {
        businessName: config.businessName,
        systemPrompt: config.systemPrompt,
        temperature: config.temperature,
        handoffKeywords: config.handoffKeywords,
        similarityThreshold: config.similarityThreshold,
        maxChunks: config.maxChunks,
      };

      const res = await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.ok) {
        showNotice('success', 'Configurações salvas com sucesso!');
        if (onConfigUpdated) {
          onConfigUpdated(config.businessName);
        }
      } else {
        showNotice('error', data.error || 'Falha ao salvar configurações.');
      }
    } catch {
      showNotice('error', 'Erro de conexão ao salvar.');
    } finally {
      setSaving(false);
    }
  };

  const handleAddKeyword = () => {
    const trimmed = newKeyword.trim();
    if (!trimmed) return;
    if (config.handoffKeywords.includes(trimmed)) return;

    setConfig((prev) => ({
      ...prev,
      handoffKeywords: [...prev.handoffKeywords, trimmed],
    }));
    setNewKeyword('');
  };

  const handleRemoveKeyword = (keyword: string) => {
    setConfig((prev) => ({
      ...prev,
      handoffKeywords: prev.handoffKeywords.filter((k) => k !== keyword),
    }));
  };

  const PRESETS = [
    {
      id: 'odontologia',
      label: 'Clínica Odontológica',
      businessName: 'Clínica Sorriso & Bem-Estar',
      systemPrompt: `Você é a Sofia, assistente virtual inteligente e acolhedora da Clínica Sorriso & Bem-Estar (Odontologia Integrada & Estética).
Seu papel é tirar dúvidas de pacientes e potenciais clientes com clareza, simpatia e precisão, baseando-se ESTRITAMENTE nas informações dos documentos fornecidos.

DIRETRIZES:
1. Responda com tom cordial, profissional e empático.
2. Se a informação estiver presente nos documentos, explique de forma clara e objetiva.
3. Se o paciente perguntar sobre valores, informe os valores médios contidos na base e reforce a necessidade de avaliação clínica presencial.
4. Se a informação NÃO constar nos documentos, seja sincera: diga gentilmente que não possui essa informação exata no momento e ofereça transferir para a equipe da recepção.
5. NUNCA invente preços, procedimentos não listados ou diagnósticos médicos.`,
      handoffKeywords: ['urgencia', 'dor', 'atendente', 'agendar', 'emergencia']
    },
    {
      id: 'trafego',
      label: 'Assistente de Tráfego',
      businessName: 'Controle de Tráfego',
      systemPrompt: `Você é o assistente virtual do Controle de Tráfego que atende os motoristas de ônibus da frota.
Seu papel é dar suporte rápido, direto e operacional aos motoristas que estão rodando nas ruas.

DIRETRIZES:
1. Trate o motorista de forma profissional e direta (ex: "Positivo, motorista", "Copiado", "Na escuta").
2. Se o motorista informar que o ônibus QUEBROU (falha mecânica, roleta, etc.), oriente-o a parar em local seguro. Deixe claro que você NÃO solicita guincho ou mecânico automaticamente, e avise que está repassando a situação para o Controle/Fiscal humano resolver. Peça para ele aguardar o contato.
3. Se o motorista informar que está PASSANDO MAL, sofreu ACIDENTE ou ASSALTO, mande ele parar o veículo imediatamente em segurança (se possível) e informe que o resgate e o supervisor/polícia já estão a caminho.
4. Para dúvidas sobre rotas, atrasos ou horários, seja curto e vá direto ao ponto.
5. Em qualquer situação de emergência, sempre registre o alerta no final dizendo "Alerta registrado no painel do CCO".`,
      handoffKeywords: ['quebrou', 'guincho', 'socorro', 'passando mal', 'acidente', 'assalto', 'emergência', 'fiscal', 'mecânico']
    },
    {
      id: 'agiota-direto',
      label: 'O Emprestador Direto',
      businessName: 'jfa.cred',
      systemPrompt: `Você é o bot de atendimento da jfa.cred. 
Sua personalidade é seca, curta e grossa. Você não tem paciência para enrolação.

DIRETRIZES:
1. Responda da forma mais curta possível. Sem saudações longas.
2. Seja direto sobre valores, taxas e datas de vencimento.
3. Se o cliente tentar renegociar ou dar desculpas, seja irredutível. Diga que o combinado não sai caro.
4. Não use emojis felizes ou simpáticos. No máximo um ⌚ ou 💰.
5. Se não souber de algo que está nos documentos, apenas diga "Não sei, vou passar pro chefe."
6. NUNCA seja simpático ou prestativo demais. O tom é estritamente de cobrança/negócio sério.`,
      handoffKeywords: ['falar com o chefe', 'renegociar', 'não tenho o dinheiro', 'esperar mais uns dias', 'humano', 'atendente']
    }
  ];

  const applyPreset = (presetId: string) => {
    const preset = PRESETS.find(p => p.id === presetId);
    if (preset) {
      setConfig({
        ...config,
        businessName: preset.businessName,
        systemPrompt: preset.systemPrompt,
        handoffKeywords: preset.handoffKeywords
      });
      showNotice('success', `Template '${preset.label}' aplicado! (Não esqueça de Salvar)`);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {notice && (
        <div
          className={`p-4 rounded-xl flex items-center gap-3 border shadow-xs ${
            notice.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-rose-50 border-rose-200 text-rose-900'
          }`}
        >
          {notice.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          )}
          <span className="text-sm font-medium">{notice.message}</span>
        </div>
      )}

      {/* Templates Prontos */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
          <Sparkles className="w-5 h-5 text-amber-500" />
          <h3 className="font-bold text-slate-900 text-base">
            Templates Prontos (Personas)
          </h3>
        </div>
        <div className="flex gap-3 flex-wrap">
          {PRESETS.map((preset) => (
            <button
              key={preset.id}
              onClick={() => applyPreset(preset.id)}
              className="px-4 py-2 bg-slate-50 hover:bg-blue-50 border border-slate-200 hover:border-blue-300 text-slate-700 hover:text-blue-700 rounded-xl text-sm font-semibold transition-colors"
            >
              Carregar: {preset.label}
            </button>
          ))}
        </div>
        <p className="text-xs text-slate-500">
          Clique em um template para preencher os campos abaixo. <strong>Lembre-se de clicar em &quot;Salvar Todas as Configurações&quot; no final da página.</strong>
        </p>
      </div>

      {/* Status da Conexão com o Google Gemini (Seguro via .env) */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              Google Gemini Inteligência Artificial
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[11px] font-bold rounded-full border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                Ativo no Servidor (.env)
              </span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Chave de API configurada com segurança no arquivo <code className="px-1.5 py-0.5 bg-slate-100 rounded text-slate-700 font-mono text-[11px]">.env</code> com o modelo <strong>Gemini Flash</strong> e embeddings integrados.
            </p>
          </div>
        </div>
      </div>

      {/* Identidade do Bot e Prompt */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-5">
        <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
          <Bot className="w-5 h-5 text-indigo-600" />
          <h3 className="font-bold text-slate-900 text-base">
            Persona & Regras do Assistente
          </h3>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
            Nome do Estabelecimento / Empresa
          </label>
          <input
            type="text"
            value={config.businessName}
            onChange={(e) => setConfig({ ...config, businessName: e.target.value })}
            placeholder="Ex: Clínica Sorriso & Bem-Estar"
            className="w-full px-4 py-2 text-sm rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-500 shadow-2xs"
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-xs font-semibold text-slate-700 uppercase">
              Instruções de Sistema (Prompt de Base)
            </label>
            <span className="text-[11px] text-slate-400">
              Define o tom de voz e como o assistente deve se comportar
            </span>
          </div>
          <textarea
            rows={7}
            value={config.systemPrompt}
            onChange={(e) => setConfig({ ...config, systemPrompt: e.target.value })}
            placeholder="Você é a Sofia, assistente virtual..."
            className="w-full px-4 py-3 text-sm rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-500 shadow-2xs font-sans leading-relaxed"
          />
        </div>
      </div>

      {/* Parâmetros do Modelo */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
          <Sliders className="w-5 h-5 text-slate-700" />
          <h3 className="font-bold text-slate-900 text-base">
            Parâmetros de Geração
          </h3>
        </div>

        <div>
          <div className="flex justify-between items-center mb-1">
            <label className="text-xs font-semibold text-slate-700 uppercase">
              Temperatura ({config.temperature})
            </label>
            <span className="text-xs text-slate-500">
              {config.temperature <= 0.2
                ? 'Muito Preciso / Fiel aos Documentos'
                : config.temperature <= 0.5
                ? 'Equilibrado (Recomendado)'
                : 'Mais Criativo / Variado'}
            </span>
          </div>
          <input
            type="range"
            min="0.0"
            max="1.0"
            step="0.05"
            value={config.temperature}
            onChange={(e) =>
              setConfig({ ...config, temperature: parseFloat(e.target.value) })
            }
            className="w-full accent-blue-600 cursor-pointer"
          />
          <div className="flex justify-between text-[11px] text-slate-400 mt-1">
            <span>0.0 (Extremamente rígido)</span>
            <span>1.0 (Mais flexível)</span>
          </div>
        </div>

        <div className="pt-2 border-t border-slate-100 mt-4">
          <div className="flex justify-between items-center mb-1 mt-4">
            <label className="text-xs font-semibold text-slate-700 uppercase">
              Limite de Similaridade ({config.similarityThreshold})
            </label>
            <span className="text-xs text-slate-500">
              {config.similarityThreshold && config.similarityThreshold >= 0.5
                ? 'Rígido (Menos Contexto)'
                : 'Flexível (Mais Contexto)'}
            </span>
          </div>
          <input
            type="range"
            min="0.0"
            max="1.0"
            step="0.05"
            value={config.similarityThreshold ?? 0.2}
            onChange={(e) =>
              setConfig({ ...config, similarityThreshold: parseFloat(e.target.value) })
            }
            className="w-full accent-blue-600 cursor-pointer"
          />
          <div className="flex justify-between text-[11px] text-slate-400 mt-1">
            <span>0.0 (Qualquer correspondência)</span>
            <span>1.0 (Correspondência exata)</span>
          </div>
        </div>

        <div className="pt-2 border-t border-slate-100 mt-4">
          <div className="flex justify-between items-center mb-1 mt-4">
            <label className="text-xs font-semibold text-slate-700 uppercase">
              Máximo de Trechos de Contexto ({config.maxChunks})
            </label>
            <span className="text-xs text-slate-500">
              Qtd. de parágrafos recuperados
            </span>
          </div>
          <input
            type="range"
            min="1"
            max="15"
            step="1"
            value={config.maxChunks ?? 5}
            onChange={(e) =>
              setConfig({ ...config, maxChunks: parseInt(e.target.value) })
            }
            className="w-full accent-blue-600 cursor-pointer"
          />
          <div className="flex justify-between text-[11px] text-slate-400 mt-1">
            <span>1 Trecho</span>
            <span>15 Trechos</span>
          </div>
        </div>
      </div>

      {/* Gatilhos de Transbordo Humano */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <div>
            <h3 className="font-bold text-slate-900 text-base">
              Palavras-Chave de Transbordo Humano
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Se o paciente enviar qualquer um destes termos, a IA acionará o alerta de intervenção para a secretária.
            </p>
          </div>
          <span className="px-2.5 py-1 bg-amber-50 text-amber-800 text-xs font-semibold rounded-full border border-amber-200">
            {config.handoffKeywords.length} termos ativos
          </span>
        </div>

        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Ex: urgência, falar com doutor, orçar..."
            value={newKeyword}
            onChange={(e) => setNewKeyword(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleAddKeyword();
              }
            }}
            className="flex-1 px-4 py-2 text-sm rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-500 shadow-2xs"
          />
          <button
            type="button"
            onClick={handleAddKeyword}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-sm font-medium inline-flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Adicionar</span>
          </button>
        </div>

        <div className="flex flex-wrap gap-2 pt-2">
          {config.handoffKeywords.map((kw) => (
            <span
              key={kw}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-100 text-slate-800 border border-slate-200 group"
            >
              <span>{kw}</span>
              <button
                type="button"
                onClick={() => handleRemoveKeyword(kw)}
                className="text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </span>
          ))}
          {config.handoffKeywords.length === 0 && (
            <p className="text-xs text-slate-400 italic">
              Nenhuma palavra-chave configurada.
            </p>
          )}
        </div>
      </div>

      {/* Botão de Salvar Geral */}
      <div className="flex justify-end pt-4">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-xl shadow-xs transition-colors disabled:opacity-50 inline-flex items-center gap-2 cursor-pointer"
        >
          {saving ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              <span>Salvando...</span>
            </>
          ) : (
            <>
              <CheckCircle2 className="w-4 h-4" />
              <span>Salvar Todas as Configurações</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
