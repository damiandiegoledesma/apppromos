const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const pino = require('pino');
const fs = require('fs');

async function iniciar() {
  const { state, saveCreds } = await useMultiFileAuthState('auth_info');
  
  const sock = makeWASocket({
    auth: state,
    printQRInTerminal: false,
    logger: pino({ level: 'silent' }),
    browser: ['Ubuntu', 'Chrome', '120.0.0.0']
  });
  
  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect, qr } = update;
    
    if (qr) {
      console.log('\n📱 QR detectado. Escanea con tu teléfono.\n');
      console.log(qr);
    }
    
    if (connection === 'open') {
      console.log('\n✅ ¡Bot conectado a WhatsApp!\n');
    }
    
    if (connection === 'close') {
      const shouldReconnect = (lastDisconnect?.error)?.statusCode !== DisconnectReason.loggedOut;
      if (shouldReconnect) {
        console.log('\n⚠️ Reconectando...\n');
        iniciar();
      } else {
        console.log('\n❌ Desconectado permanentemente\n');
      }
    }
  });
  
  sock.ev.on('creds.update', saveCreds);
  
  sock.ev.on('messages.upsert', async (m) => {
    const mensaje = m.messages[0];
    
    if (mensaje.key.fromMe) return;
    
    const texto = (
      mensaje.message?.conversation ||
      mensaje.message?.extendedTextMessage?.text ||
      ''
    ).toLowerCase().trim();
    
    if (!texto) return;
    
    console.log(`📨 ${mensaje.pushName}: ${texto}`);
    
    let respuesta = null;
    
    if (texto.includes('horario') || texto.includes('hora')) {
      respuesta = '🕐 Horarios:\nLunes-Viernes: 8AM-6PM\nSábados: 8AM-2PM\nDomingos: Cerrado';
    }
    
    if (texto.includes('dirección') || texto.includes('dónde')) {
      respuesta = '📍 3 de Febrero 136, Venado Tuerto';
    }
    
    if (texto.includes('precio') || texto.includes('cuánto')) {
      respuesta = 'Enviame una foto del corte y te paso presupuesto 💪';
    }
    
    if (respuesta) {
      await new Promise(r => setTimeout(r, 1000));
      
      await sock.sendMessage(mensaje.key.remoteJid, {
        text: respuesta
      });
      
      console.log(`✅ Respondido`);
    }
  });
}

iniciar().catch(console.error);