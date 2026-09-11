# 🏥 AtendeFlow - Assistente Inteligente Omnichannel


> **AtendeFlow** é uma solução de atendimento inteligente desenvolvida em **Next.js**, projetada para modernizar o atendimento ao paciente em clínicas e consultórios. O sistema atua como uma central omnichannel (Web + WhatsApp), combinando **Inteligência Artificial (RAG)** e **Transbordo Humano**.

---

## 🚀 Sobre o Projeto

Este projeto foi construído para resolver um problema real: a sobrecarga no atendimento de clínicas. Com o **AtendeFlow**, o primeiro contato do paciente é feito por uma Inteligência Artificial (apelidada de Sofia IA). A IA não usa respostas genéricas; ela é equipada com **RAG (Retrieval-Augmented Generation)**, consultando ativamente uma Base de Conhecimento interna (preços, convênios, horários) antes de responder.

Se a IA identificar uma emergência, ou se o paciente solicitar falar com um atendente, o sistema ativa o **Transbordo Humano**, pausando a IA e enviando um alerta para a recepção assumir o controle do chat em tempo real.

## 🎯 Principais Funcionalidades

- **🤖 IA com Contexto (RAG):** Utiliza o Google Gemini e bancos vetoriais para ler documentos privados da clínica e responder de forma precisa, sem alucinações.
- **📱 Integração Nativa WhatsApp:** Usa a biblioteca `@whiskeysockets/baileys` para se conectar diretamente ao WhatsApp Web via QR Code, sem custos de API oficial.
- **👩‍💻 Transbordo Humano Inteligente:** A IA identifica a intenção do usuário. Caso haja necessidade, a IA é pausada e o atendimento manual é liberado no painel da clínica.
- **🧪 Playground de IA Integrado:** Ambiente seguro para testar o comportamento da IA e inspecionar quais trechos de texto da Base de Conhecimento foram utilizados para compor a resposta (com porcentagem de similaridade).
- **🎨 Interface Moderna:** Construída com TailwindCSS e Lucide Icons, seguindo os princípios de Clean Code e componentização.

## 🛠️ Tecnologias Utilizadas

- **Frontend & Fullstack:** [Next.js (App Router)](https://nextjs.org/) + React
- **Estilização:** [Tailwind CSS](https://tailwindcss.com/)
- **Inteligência Artificial:** Google Generative AI (Gemini) + Vector Embeddings
- **WhatsApp API:** `@whiskeysockets/baileys`
- **Banco de Dados (Em transição):** Supabase (PostgreSQL + pgvector)

## 📁 Arquitetura e Componentização

O código do Frontend segue rigorosos padrões de Clean Code, com responsabilidades muito bem separadas. O monolito de visualização de chats foi componentizado nas seguintes estruturas:
- `InboxTab.tsx`: Orquestrador de estados e chamadas de API.
- `ConversationList.tsx`: Visualização da lista de pacientes e aplicação de filtros dinâmicos.
- `ChatWindow.tsx`: Área de atendimento contendo a gestão do transbordo humano.
- `MessageBubble.tsx`: Isolamento visual de mensagens, mostrando as Fontes Citadas do RAG.

## ⚙️ Como Executar Localmente

### Pré-requisitos
- Node.js (v18+)
- Conta no Google AI Studio (para obter a API Key do Gemini)
- Conta no Supabase (em andamento)

### Passos

1. Clone o repositório:
   ```bash
   git clone https://github.com/EduBraga7/atende-flow.git
   ```
2. Instale as dependências:
   ```bash
   npm install
   ```
3. Crie um arquivo `.env` na raiz do projeto e adicione sua chave de IA:
   ```env
   GEMINI_API_KEY=sua_chave_aqui
   ```
4. Inicie o servidor de desenvolvimento:
   ```bash
   npm run dev
   ```
5. Acesse `http://localhost:3000` no navegador.

## 👨‍💻 Desenvolvedor

Projeto desenvolvido para demonstrar habilidades avançadas na construção de produtos de ponta a ponta, integrando soluções modernas de IA com ferramentas de comunicação reais (WhatsApp).

---
*Este é um projeto de portfólio. As informações simuladas de pacientes e clínicas são puramente ilustrativas.*
