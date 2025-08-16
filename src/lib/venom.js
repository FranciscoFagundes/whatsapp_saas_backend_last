// src/lib/venom.js
const venom = require('venom-bot');
const WebSocket = require('ws');

// Objeto para armazenar as sessões do Venom, uma por usuário
let venomClients = {};

// Mapa para associar o ID do usuário à sua conexão WebSocket
let userSockets = new Map();

// Cria uma instância do servidor WebSocket
const wss = new WebSocket.Server({ port: 8080 });

// Lida com novas conexões WebSocket
wss.on('connection', ws => {
    console.log('Cliente WebSocket conectado!');
    
    // Quando o cliente envia uma mensagem (esperamos o userId)
    ws.on('message', message => {
        const data = JSON.parse(message);
        if (data.type === 'start_session' && data.userId) {
            console.log(`Recebido pedido para iniciar sessão para o usuário: ${data.userId}`);
            // Adiciona o userId à conexão WebSocket
            userSockets.set(data.userId, ws);
            // Inicia a sessão do Venom
            createVenomSession(data.userId);
        }
    });

    ws.on('close', () => {
        // Remove a conexão do mapa quando o cliente se desconecta
        for (let [key, value] of userSockets.entries()) {
            if (value === ws) {
                userSockets.delete(key);
                console.log(`Conexão WebSocket para o usuário ${key} fechada.`);
                break;
            }
        }
    });
});

/**
 * Cria ou retorna a sessão do Venom para um usuário específico.
 * Nota: Removida a dependência do supabaseClient para esta abordagem.
 * @param {string} userId O ID do usuário.
 * @returns {Promise<object>} O cliente Venom.
 */
const createVenomSession = async (userId) => {
    console.log(`[Venom] Chamada para createVenomSession para o usuário: ${userId}`);
    // Se o cliente para este usuário já existir, retorne-o
    if (venomClients[userId]) {
        console.log(`[Venom] Cliente para o usuário ${userId} já existe. Retornando cliente existente.`);
        return venomClients[userId];
    }
    
    console.log(`[Venom] Nenhum cliente encontrado para ${userId}. Criando nova sessão...`);

    const clientSocket = userSockets.get(userId);
    if (!clientSocket) {
        console.error(`[Venom] Erro: Conexão WebSocket para o usuário ${userId} não encontrada.`);
        return null;
    }

    try {
        const venomClient = await venom.create({
            session: `session_${userId}`,
            // Desativa o modo headless para ver o navegador
            // Usa a versão do navegador que o puppeteer instala por padrão.
            puppeteer: {},
            // O ouvinte de estado principal
            onStateChange: async (state) => {
                console.log(`[Venom] Status da sessão do usuário ${userId}: ${state}`);
                // Envia o status para o frontend via WebSocket
                if (clientSocket.readyState === WebSocket.OPEN) {
                    clientSocket.send(JSON.stringify({ type: 'status', status: state }));
                }

                if (state === 'connected') {
                    console.log(`[Venom] Status: connected.`);
                    // Nota: a lógica do Supabase foi removida daqui, pois o frontend gerencia o estado.
                }
            },
            // O ouvinte de QR Code.
            onqrCode: async (qrCodeDataUrl) => {
                console.log(`[Venom] onqrCode acionado. Gerando QR Code para o usuário ${userId}.`);
                // Envia o QR Code para o frontend via WebSocket
                if (clientSocket.readyState === WebSocket.OPEN) {
                    clientSocket.send(JSON.stringify({ type: 'qr_code', data: qrCodeDataUrl }));
                }
            }
        });

        venomClients[userId] = venomClient;
        console.log(`[Venom] Cliente Venom inicializado com sucesso para o usuário ${userId}.`);

        return venomClient;

    } catch (err) {
        console.error(`[Venom] Erro ao criar sessão para o usuário ${userId}:`, err);
        console.error(`[Venom] Causa Provável: Problema de conexão ou configuração. Por favor, verifique se não há outra sessão do WhatsApp aberta.`);
        if (clientSocket.readyState === WebSocket.OPEN) {
                    clientSocket.send(JSON.stringify({ type: 'error', message: err.message }));
                }
        throw err;
    }
};

/**
 * Obtém o cliente Venom de um usuário específico.
 * @param {string} userId O ID do usuário.
 * @returns {object|null} O cliente Venom, ou nulo se não existir.
 */
const getVenomClient = (userId) => venomClients[userId];

/**
 * Envia uma mensagem para um número de WhatsApp.
 * @param {string} userId O ID do usuário.
 * @param {string} phoneNumber O número de telefone.
 * @param {string} message A mensagem a ser enviada.
 * @returns {Promise<object>} O resultado da mensagem enviada.
 */
const sendWhatsAppMessage = async (userId, phoneNumber, message) => {
    const client = getVenomClient(userId);
    if (!client) {
        throw new Error("Cliente WhatsApp não está conectado para este usuário.");
    }
    return client.sendText(phoneNumber, message);
};

// Exporte as funções
module.exports = { createVenomSession, getVenomClient, sendWhatsAppMessage, wss };
