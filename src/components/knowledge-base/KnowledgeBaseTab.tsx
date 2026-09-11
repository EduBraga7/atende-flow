'use client';

import React, { useState, useEffect } from 'react';
import {
  FileText,
  UploadCloud,
  Trash2,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Database,
  Layers,
  FilePlus2,
  RefreshCw,
} from 'lucide-react';
import { DocumentMetadata } from '@/lib/rag/types';

interface Stats {
  totalDocuments: number;
  totalChunks: number;
  chunksWithEmbeddings: number;
}

export default function KnowledgeBaseTab() {
  const [documents, setDocuments] = useState<DocumentMetadata[]>([]);
  const [stats, setStats] = useState<Stats>({
    totalDocuments: 0,
    totalChunks: 0,
    chunksWithEmbeddings: 0,
  });
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [manualTextModal, setManualTextModal] = useState(false);
  const [manualTitle, setManualTitle] = useState('');
  const [manualContent, setManualContent] = useState('');
  const [notification, setNotification] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  const fetchDocuments = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/documents');
      const data = await res.json();
      if (res.ok) {
        setDocuments(data.documents || []);
        setStats(
          data.stats || {
            totalDocuments: 0,
            totalChunks: 0,
            chunksWithEmbeddings: 0,
          }
        );
      }
    } catch (err) {
      console.error('Falha ao carregar documentos', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  const showNotice = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 5000);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/documents', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (res.ok) {
        showNotice(
          'success',
          `Documento "${file.name}" indexado com sucesso! (${data.chunksCreated} chunks criados)`
        );
        fetchDocuments();
      } else {
        showNotice('error', data.error || 'Erro ao enviar arquivo.');
      }
    } catch {
      showNotice('error', 'Falha na conexão ao enviar arquivo.');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleLoadSample = async () => {
    setUploading(true);
    try {
      const res = await fetch('/api/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isSample: true }),
      });
      const data = await res.json();
      if (res.ok) {
        showNotice(
          'success',
          `Base de exemplo da Clínica Sorriso & Bem-Estar carregada! (${data.chunksCreated} chunks gerados)`
        );
        fetchDocuments();
      } else {
        showNotice('error', data.error || 'Falha ao carregar exemplo.');
      }
    } catch {
      showNotice('error', 'Erro ao carregar base de exemplo.');
    } finally {
      setUploading(false);
    }
  };

  const handleManualSave = async () => {
    if (!manualContent.trim()) {
      showNotice('error', 'O conteúdo do texto não pode estar vazio.');
      return;
    }
    setUploading(true);
    try {
      const res = await fetch('/api/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: manualTitle || 'Texto Avulso',
          content: manualContent,
          fileType: 'manual',
        }),
      });
      const data = await res.json();
      if (res.ok) {
        showNotice('success', 'Conteúdo adicionado e indexado com sucesso!');
        setManualTextModal(false);
        setManualTitle('');
        setManualContent('');
        fetchDocuments();
      } else {
        showNotice('error', data.error || 'Erro ao salvar texto.');
      }
    } catch {
      showNotice('error', 'Erro ao enviar dados.');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Deseja remover "${title}" da base de conhecimento?`)) return;
    try {
      const res = await fetch(`/api/documents?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        showNotice('success', 'Documento removido.');
        fetchDocuments();
      } else {
        showNotice('error', 'Não foi possível remover o documento.');
      }
    } catch {
      showNotice('error', 'Erro ao conectar para remoção.');
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-6">
      {/* Notificação flutuante */}
      {notification && (
        <div
          className={`p-4 rounded-xl flex items-center gap-3 border shadow-sm transition-all ${
            notification.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-rose-50 border-rose-200 text-rose-900'
          }`}
        >
          {notification.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          )}
          <span className="text-sm font-medium">{notification.message}</span>
        </div>
      )}

      {/* Cards de Métricas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Documentos Ativos
            </p>
            <h3 className="text-2xl font-bold text-slate-900 mt-1">
              {stats.totalDocuments}
            </h3>
          </div>
          <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600">
            <FileText className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Chunks Indexados (Fragmentos)
            </p>
            <h3 className="text-2xl font-bold text-slate-900 mt-1">
              {stats.totalChunks}
            </h3>
          </div>
          <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600">
            <Layers className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Vetores em Memória
            </p>
            <h3 className="text-2xl font-bold text-slate-900 mt-1">
              {stats.chunksWithEmbeddings} / {stats.totalChunks}
            </h3>
          </div>
          <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600">
            <Database className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Área de Ações & Upload */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              Alimentar Base de Conhecimento
            </h2>
            <p className="text-sm text-slate-600">
              Faça upload de arquivos PDF, TXT ou carregue o modelo de exemplo para começar.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={handleLoadSample}
              disabled={uploading}
              className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-sm font-medium rounded-xl shadow-xs transition-all disabled:opacity-50 cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              <span>Carregar Exemplo da Clínica</span>
            </button>

            <button
              onClick={() => setManualTextModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium rounded-xl transition-all cursor-pointer"
            >
              <FilePlus2 className="w-4 h-4" />
              <span>Inserir Texto</span>
            </button>
          </div>
        </div>

        {/* Zona de Drop / Upload */}
        <label className="border-2 border-dashed border-slate-300 hover:border-blue-500 bg-slate-50/70 hover:bg-blue-50/40 transition-all rounded-2xl p-8 flex flex-col items-center justify-center text-center cursor-pointer group block">
          <input
            type="file"
            accept=".pdf,.txt,.md"
            onChange={handleFileUpload}
            disabled={uploading}
            className="hidden"
          />
          <div className="w-14 h-14 rounded-2xl bg-white shadow-xs border border-slate-200 flex items-center justify-center text-blue-600 group-hover:scale-105 transition-transform mb-3">
            <UploadCloud className="w-7 h-7" />
          </div>
          <p className="text-sm font-semibold text-slate-800">
            {uploading ? 'Processando e gerando embeddings...' : 'Clique para selecionar ou arraste arquivos aqui'}
          </p>
          <p className="text-xs text-slate-500 mt-1">
            Suporta arquivos em formato PDF, TXT e Markdown (.md)
          </p>
        </label>
      </div>

      {/* Lista de Documentos */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-slate-900">Documentos Indexados</h3>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
              {documents.length}
            </span>
          </div>

          <button
            onClick={fetchDocuments}
            disabled={loading}
            title="Atualizar lista"
            className="p-2 text-slate-500 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {documents.length === 0 ? (
          <div className="p-12 text-center">
            <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-800 font-medium">Nenhum documento na base</p>
            <p className="text-slate-500 text-sm mt-1 max-w-sm mx-auto">
              Clique no botão <strong>Carregar Exemplo da Clínica</strong> acima para testar o sistema instantaneamente com a base odontológica.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {documents.map((doc) => (
              <div
                key={doc.id}
                className="p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:bg-slate-50/80 transition-colors"
              >
                <div className="flex items-start gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 mt-0.5 sm:mt-0">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-slate-900">
                      {doc.title}
                    </h4>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 mt-1">
                      <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded uppercase">
                        {doc.fileType}
                      </span>
                      <span>•</span>
                      <span>{formatBytes(doc.sizeBytes)}</span>
                      <span>•</span>
                      <span className="text-indigo-600 font-medium">
                        {doc.chunkCount} {doc.chunkCount === 1 ? 'chunk' : 'chunks'}
                      </span>
                      <span>•</span>
                      <span>
                        {new Date(doc.createdAt).toLocaleDateString('pt-BR', {
                          day: '2-digit',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center">
                  <button
                    onClick={() => handleDelete(doc.id, doc.title)}
                    className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                    title="Remover documento"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal Inserir Texto Manual */}
      {manualTextModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-lg w-full p-6 space-y-4">
            <h3 className="text-lg font-bold text-slate-900">
              Adicionar Conteúdo de Texto
            </h3>
            <p className="text-sm text-slate-600">
              Cole regras, tabelas ou instruções específicas para adicionar à base do assistente.
            </p>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Título do Documento
                </label>
                <input
                  type="text"
                  placeholder="Ex: Política de Descontos e Convênios"
                  value={manualTitle}
                  onChange={(e) => setManualTitle(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Conteúdo
                </label>
                <textarea
                  rows={6}
                  placeholder="Cole ou digite as informações aqui..."
                  value={manualContent}
                  onChange={(e) => setManualContent(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setManualTextModal(false)}
                className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleManualSave}
                disabled={uploading}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
              >
                {uploading ? 'Salvando...' : 'Salvar e Indexar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
