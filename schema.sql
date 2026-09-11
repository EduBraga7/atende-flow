-- Habilitar extensão de banco vetorial
CREATE EXTENSION IF NOT EXISTS vector;

-- 1. Configurações do Bot
CREATE TABLE IF NOT EXISTS bot_config (
  id text PRIMARY KEY DEFAULT 'default',
  business_name text NOT NULL DEFAULT 'Clínica',
  bot_persona text NOT NULL DEFAULT 'Você é uma assistente.',
  similarity_threshold float NOT NULL DEFAULT 0.6,
  max_chunks integer NOT NULL DEFAULT 3,
  updated_at timestamp with time zone DEFAULT now()
);

INSERT INTO bot_config (id, business_name, bot_persona) 
VALUES ('default', 'Atendimento Inteligente', 'Você é uma assistente.') 
ON CONFLICT (id) DO NOTHING;

-- 2. Conversas
CREATE TABLE IF NOT EXISTS conversations (
  id text PRIMARY KEY,
  customer_name text NOT NULL,
  customer_phone text,
  channel text NOT NULL,
  status text NOT NULL,
  unread_count integer DEFAULT 0,
  last_message text,
  last_message_at timestamp with time zone,
  handoff_reason text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- 3. Mensagens
CREATE TABLE IF NOT EXISTS messages (
  id text PRIMARY KEY,
  conversation_id text REFERENCES conversations(id) ON DELETE CASCADE,
  role text NOT NULL,
  content text NOT NULL,
  timestamp text NOT NULL,
  sender_type text,
  sender_name text,
  handoff_triggered boolean DEFAULT false,
  sources jsonb,
  created_at timestamp with time zone DEFAULT now()
);

-- 4. Documentos da Base de Conhecimento
CREATE TABLE IF NOT EXISTS documents (
  id text PRIMARY KEY,
  title text NOT NULL,
  content text NOT NULL,
  type text NOT NULL,
  created_at text NOT NULL,
  updated_at text NOT NULL
);

-- 5. Pedaços de Documentos (Chunks para a Inteligência Artificial)
CREATE TABLE IF NOT EXISTS document_chunks (
  id text PRIMARY KEY,
  document_id text REFERENCES documents(id) ON DELETE CASCADE,
  content text NOT NULL,
  embedding vector(768)
);

-- Otimização da busca vetorial
CREATE INDEX IF NOT EXISTS document_chunks_embedding_idx 
ON document_chunks 
USING hnsw (embedding vector_cosine_ops);
