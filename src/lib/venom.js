// src/lib/venom.js
const venom = require('venom-bot');
const { serviceRoleSupabase } = require('./supabase');

// Objeto para armazenar as sessões do Venom, uma por usuário
let venomClients = {};

/**
 * Cria ou retorna a sessão do Venom para um usuário específico.
 * Retorna o QR Code via promessa.
 * @param {string} userId O ID do usuário.
 * @returns {Promise<object>} O QR Code como uma string, ou um erro se falhar.
 */
const getQRCodeFromVenom = async (userId) => {
    // Se o cliente para este usuário já existir, retorne-o
    if (venomClients[userId]) {
        console.log(`Cliente Venom para o usuário ${userId} já existe.`);
        // Verifique o status da sessão antes de retornar
        const status = await venomClients[userId].checkConnectionStatus();
        if (status === 'isLogged' || status === 'qrReadSuccess') {
            console.log(`Sessão do usuário ${userId} já está conectada. Retornando status 'connected'.`);
            return { status: 'connected' };
        }
    }

    // AQUI: Usamos uma promessa para esperar a criação do cliente.
    // Os ouvintes de evento são passados diretamente na configuração.
    return new Promise((resolve, reject) => {
        try {
            venom.create({
                session: `session_${userId}`,
                headless: 'new',
                logQR: true,

                // Ouvinte correto para QR Code
                catchQR: (base64Qrimg, asciiQR, attempts, urlCode) => {
                    console.log("ASCII QR:\n", asciiQR);
                    console.log(`QR Code gerado para o usuário ${userId}. Resolvendo a promessa.`);
                    resolve(base64Qrimg); // aqui você pode salvar o base64
                },

                // Status da sessão
                statusFind: (statusSession, session) => {
                    console.log(`Status da sessão do usuário ${userId}: ${statusSession}`);
                },

                // Mudanças de estado
                onStateChange: async (state) => {
                    console.log(`State change para ${userId}: ${state}`);

                    if (state === 'CONNECTED') {
                        await serviceRoleSupabase
                            .from('whatsapp_sessions_2')
                            .update({ status: 'connected', qr_code_data: null })
                            .eq('user_id', userId);
                    } else if (state === 'TIMEOUT' || state === 'FAILURE') {
                        reject(new Error(`Erro de conexão Venom: ${state}`));
                    }
                },
            }).then((client) => {
                venomClients[userId] = client;
                console.log(`Cliente Venom inicializado para o usuário ${userId}.`);
            }).catch((err) => {
                console.error(`Erro ao criar cliente Venom para o usuário ${userId}:`, err);
                reject(err);
            });
        } catch (err) {
            console.error(`Erro ao criar sessão para o usuário ${userId}:`, err);
            reject(err);
        }
    });

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
module.exports = { getQRCodeFromVenom, getVenomClient, sendWhatsAppMessage };
