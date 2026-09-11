'use client';

import React, { useState, useEffect } from 'react';
import InboxTab from '@/components/inbox/InboxTab';
import WhatsAppConnectTab from '@/components/whatsapp/WhatsAppConnectTab';
import KnowledgeBaseTab from '@/components/knowledge-base/KnowledgeBaseTab';
import SettingsTab from '@/components/settings/SettingsTab';
import Header, { TabType } from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';

export default function Home() {
  const [activeTab, setActiveTab] = useState<TabType>('inbox');
  const [businessName, setBusinessName] = useState('Atendimento Inteligente');
  const [pendingHandoffs, setPendingHandoffs] = useState<number>(0);
  const [whatsappConnected, setWhatsappConnected] = useState<boolean>(false);

  const fetchGlobalStats = () => {
    fetch('/api/conversations')
      .then((res) => res.json())
      .then((data) => {
        if (data.stats) {
          setPendingHandoffs(data.stats.waiting_human || 0);
        }
      })
      .catch((err) => console.error(err));

    fetch('/api/whatsapp/status')
      .then((res) => res.json())
      .then((data) => {
        setWhatsappConnected(data.status === 'connected');
      })
      .catch(() => {});
  };

  useEffect(() => {
    fetch('/api/config')
      .then((res) => res.json())
      .then((data) => {
        if (data.businessName) {
          setBusinessName(data.businessName);
        }
      })
      .catch((err) => console.error(err));

    fetchGlobalStats();
    const interval = setInterval(fetchGlobalStats, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-slate-100/60">
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        businessName={businessName}
        pendingHandoffs={pendingHandoffs}
        whatsappConnected={whatsappConnected}
      />

      {/* Conteúdo Principal */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'inbox' && <InboxTab />}
        {activeTab === 'whatsapp' && (
          <WhatsAppConnectTab onStatusChange={setWhatsappConnected} />
        )}

        {activeTab === 'knowledge' && <KnowledgeBaseTab />}
        {activeTab === 'settings' && (
          <SettingsTab
            onConfigUpdated={(newName) => {
              if (newName) setBusinessName(newName);
            }}
          />
        )}
      </main>

      <Footer />
    </div>
  );
}
