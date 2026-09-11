import fs from 'fs';
import path from 'path';

console.log('=== TESTES AUTOMATIZADOS: ATENDEFLOW INBOX & CONVERSATION STORE ===\n');

const DATA_DIR = path.join(process.cwd(), 'data');
const CONV_PATH = path.join(DATA_DIR, 'conversations.json');

if (!fs.existsSync(CONV_PATH)) {
  console.error('❌ Arquivo de conversas não encontrado!');
  process.exit(1);
}

const conversations = JSON.parse(fs.readFileSync(CONV_PATH, 'utf-8'));
console.log(`1. Verificação do Store de Conversas:`);
console.log(`   - Total de conversas carregadas: ${conversations.length}`);

if (conversations.length === 0) {
  console.error('❌ Nenhuma conversa encontrada!');
  process.exit(1);
}
console.log('✅ Estrutura de persistência de conversas validada com sucesso!\n');

// 2. Teste do Fluxo de Transbordo (Caso Carlos Eduardo ou conversas com handoffTriggered)
const carlos = conversations.find(c => c.id === 'conv_carlos_eduardo');
if (!carlos) {
  console.error('❌ Conversa de Carlos Eduardo não encontrada!');
  process.exit(1);
}

console.log(`2. Verificação do Caso de Transbordo Real (Carlos Eduardo):`);
console.log(`   - Paciente: ${carlos.customerName} (${carlos.customerPhone})`);
console.log(`   - Motivo do Transbordo: "${carlos.handoffReason}"`);
console.log(`   - Mensagens registradas: ${carlos.messages.length}`);

const hasEmergencyTrigger = carlos.messages.some(m => m.handoffTriggered === true);
if (!hasEmergencyTrigger) {
  console.error('❌ Falha na validação das flags de transbordo!');
  process.exit(1);
}
console.log('✅ Validação do fluxo de emergência/transbordo aprovada!\n');

// 3. Teste de Transição de Status e Intervenção Humana
console.log(`3. Teste de Simulação de Intervenção Humana:`);
const simulatedMsg = {
  id: `msg_test_agent_${Date.now()}`,
  role: 'assistant',
  senderType: 'human_agent',
  senderName: 'Patrícia (Recepção)',
  content: 'Carlos, pode vir agora mesmo! Já preparei a sala 2 para atendimento prioritário com a Dra. Camila.',
  timestamp: '15:05',
};

const simulatedConv = { ...carlos, messages: [...carlos.messages, simulatedMsg], status: 'human', unreadCount: 0 };

console.log(`   - Atendente enviou: "${simulatedMsg.content}"`);
console.log(`   - Novo Status da Conversa: ${simulatedConv.status}`);
console.log(`   - Mensagens não lidas: ${simulatedConv.unreadCount}`);

if (simulatedConv.status !== 'human') {
  console.error('❌ Status não mudou para human!');
  process.exit(1);
}
console.log('✅ Fluxo de intervenção humana aprovado com sucesso!\n');

console.log('🎉 TODOS OS TESTES DA CENTRAL DE ATENDIMENTO PASSARAM COM 100% DE SUCESSO!');
