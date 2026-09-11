import React from 'react';

export default function Footer() {
  return (
    <footer className="border-t border-slate-200/80 bg-white py-4 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500">
        <p>
          AtendeFlow © {new Date().getFullYear()} • Plataforma Omnichannel Inteligente com Transbordo Humano
        </p>
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1 text-emerald-600 font-semibold">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            Central Operacional
          </span>
        </div>
      </div>
    </footer>
  );
}
