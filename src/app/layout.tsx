import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'AtendeFlow - Assistente Inteligente Omnichannel com RAG',
  description: 'Atendimento automatizado com IA para pequenos negócios baseado nos seus próprios documentos.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className="h-full">
      <body className="h-full bg-slate-50 text-slate-900 antialiased selection:bg-blue-100 selection:text-blue-900">
        {children}
      </body>
    </html>
  );
}
