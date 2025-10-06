const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const fs = require('fs');

// =============================
// ======= CONFIGURAÇÕES =======
// =============================

const client = new Client({
  authStrategy: new LocalAuth({ dataPath: 'session' }),
  puppeteer: { headless: true }
});

// =============================
// ======= MENUS E TEXTOS ======
// =============================

const menuPrincipal =`
Bem-vindo ao Pet Shop!
Escolha uma opção:

1 - Ver horários
2 - Serviços e preços
3 - Ver Unidade 
`;

const menuServicos = `
Escolha sua opção:

1 - Banho e Tosa
2 - Clínica Veterinária
3 - Hotelzinho
0 - Voltar ao menu principal
`;

const textos = {
  horarios: `📅 Segunda a sexta: 08h às 19h\n📅 Sábado: 08h às 14h\n\n0 - Voltar ao menu principal`,
  banhoTosa: `💦 *Banho Completo:* R$50,00\n✂️ *Tosa higiênica:* R$40,00\n🐕 *Tosa completa:* R$70,00\n🧴 *Hidratação:* R$30,00\n\n0 - Voltar ao menu principal`,
  clinica: `🐾 *Consulta geral:* R$80,00\n💉 *Vacinação:* R$60,00 + valor da vacina\n🩺 *Exames:* A partir de R$50,00\n🏥 *Cirurgias:* Sob orçamento\n\n0 - Voltar ao menu principal`,
  hotel: `🏨 *Diária:* R$60,00\n🐕 *Pacote semanal:* R$350,00\n🐩 *Pacote mensal:* R$1100,00\nInclui: alimentação, passeio e cuidados básicos\n\n0 - Voltar ao menu principal`,
  unidades: `📍Rua das Acácias, 128 - Bairro Jardim Bela Vista, São Paulo - SP, CEP 04567-120\n\n0 - Voltar ao menu principal`,
  agendamentoIntro: `📌 Vamos agendar um horário!\n\nPor favor, me diga o *nome do seu pet*.`,
  agendamentoServicos: `Escolha o tipo de serviço para o agendamento:\n\n1 - Banho e Tosa\n2 - Clínica Veterinária\n3 - Hotelzinho`,
};

// =============================
// ====== GERENCIAR ESTADO =====
// =============================

const STATE_FILE = './state.json';
let userState = {};

if (fs.existsSync(STATE_FILE)) {
  userState = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
}

function saveState() {
  fs.writeFileSync(STATE_FILE, JSON.stringify(userState));
}

function setState(user, state) {
  userState[user] = state;
  saveState();
}

function getState(user) {
  return userState[user] || 'main';
}

// =============================
// ======= EVENTOS DO BOT ======
// =============================

client.on('qr', qr => qrcode.generate(qr, { small: true }));
client.on('ready', () => console.log('Bot do Pet Shop está online!'));
client.on('error', e => console.error('Erro:', e));
client.on('disconnected', r => console.log('Desconectado:', r));

// Envia menu automático ao iniciar conversa nova
client.on('message_create', async msg => {
  if (msg.fromMe) return; // ignora mensagens do próprio bot
  const user = msg.to || msg.from;
  if (!userState[user]) {
    setState(user, 'main');
    await client.sendMessage(user, menuPrincipal);
  }
});

// =============================
// ========= LÓGICA ============
// =============================

client.on('message', async msg => {
  const user = msg.from;
  const text = msg.body.trim().toLowerCase();
  const state = getState(user);

  // ======================
  // ===== MENU MAIN ======
  // ======================
  if (state === 'main') {
    if (['menu', 'oi', 'olá', 'inicio', 'iniciar', 'começar', 'start'].includes(text) || text.length === 0) {
      await msg.reply(menuPrincipal);
      return;
    }

    if (['1', 'horario', 'horários'].includes(text)) {
      await msg.reply(textos.horarios);
    } else if (['2', 'servicos', 'serviços'].includes(text)) {
      await msg.reply(menuServicos);
      setState(user, 'servicos');
    } else if (['3', 'unidades', 'lojas'].includes(text)) {
      await msg.reply(textos.unidades);
      setState(user, 'menuVoltar');
    } else if (['4', 'agendar', 'agendamento'].includes(text)) {
      await msg.reply(textos.agendamentoIntro);
      setState(user, 'agendamento_nome');
    } else {
      await msg.reply(menuPrincipal);
    }

  // ======================
  // ===== SERVIÇOS =======
  // ======================
  } else if (state === 'servicos') {
    if (text === '0' || text === 'menu') {
      await msg.reply(menuPrincipal);
      setState(user, 'main');
    } else if (['1', 'banho', 'tosa'].includes(text)) {
      await msg.reply(textos.banhoTosa);
      setState(user, 'menuVoltar');
    } else if (['2', 'clinica', 'veterinaria'].includes(text)) {
      await msg.reply(textos.clinica);
      setState(user, 'menuVoltar');
    } else if (['3', 'hotel', 'hotelzinho'].includes(text)) {
      await msg.reply(textos.hotel);
      setState(user, 'menuVoltar');
    } else {
      await msg.reply(menuServicos);
    }

  // ======================
  // ===== VOLTAR ========
  // ======================
  } else if (state === 'menuVoltar') {
    if (text === '0' || text === 'menu' || text === 'voltar') {
      await msg.reply(menuPrincipal);
      setState(user, 'main');
    } else {
      await msg.reply('Digite *0* para voltar ao menu principal.');
    }

  // ======================
  // ===== AGENDAMENTO ====
  // ======================
  } else if (state === 'agendamento_nome') {
    userState[user] = { step: 'servico', petName: msg.body };
    saveState();
    await msg.reply(`🐶 Nome do pet: *${msg.body}*\n\nAgora escolha o serviço:\n\n${textos.agendamentoServicos}`);

  } else if (userState[user]?.step === 'servico') {
    let servicoEscolhido = '';
    if (['1', 'banho', 'tosa'].includes(text)) servicoEscolhido = 'Banho e Tosa';
    else if (['2', 'clinica', 'veterinaria'].includes(text)) servicoEscolhido = 'Clínica Veterinária';
    else if (['3', 'hotel', 'hotelzinho'].includes(text)) servicoEscolhido = 'Hotelzinho';

    if (servicoEscolhido) {
      userState[user].servico = servicoEscolhido;
      userState[user].step = 'data';
      saveState();
      await msg.reply(`✂️ Serviço escolhido: *${servicoEscolhido}*\n\nAgora me diga a *data desejada* (ex: 12/10/2025):`);
    } else {
      await msg.reply(`❌ Opção inválida. Escolha uma das opções:\n\n${textos.agendamentoServicos}`);
    }

  } else if (userState[user]?.step === 'data') {
    userState[user].date = msg.body;
    userState[user].step = 'hora';
    saveState();
    await msg.reply(`📅 Data escolhida: *${msg.body}*\n\nAgora me diga o *horário desejado* (ex: 14h30):`);

  } else if (userState[user]?.step === 'hora') {
    userState[user].time = msg.body;
    userState[user].step = 'confirmacao';
    saveState();
    await msg.reply(`⏰ Horário escolhido: *${msg.body}*\n\nPor favor, confirme o agendamento:\n\n🐶 Pet: *${userState[user].petName}*\n✂️ Serviço: *${userState[user].servico}*\n📅 Data: *${userState[user].date}*\n⏰ Hora: *${userState[user].time}*\n\nDigite *confirmar* ou *cancelar*.`);

  } else if (userState[user]?.step === 'confirmacao') {
    if (text === 'confirmar') {
      await msg.reply(`✅ Agendamento confirmado!\n\n🐶 Pet: *${userState[user].petName}*\n✂️ Serviço: *${userState[user].servico}*\n📅 Data: *${userState[user].date}*\n⏰ Hora: *${userState[user].time}*\n\nObrigado!`);
      setState(user, 'main');
    } else if (text === 'cancelar') {
      await msg.reply(`❌ Agendamento cancelado. Voltando ao menu principal...`);
      setState(user, 'main');
      await msg.reply(menuPrincipal);
    } else {
      await msg.reply(`Digite *confirmar* ou *cancelar*.`);
    }
  }
});

// =============================
// ========= INICIAR ===========
// =============================

client.initialize();
