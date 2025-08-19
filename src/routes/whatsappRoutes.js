// src/routes/whatsapp.js
const express = require('express');
const router = express.Router();
const { serviceRoleSupabase } = require('../lib/supabase');
const { getQRCodeFromVenom } = require('../lib/venom');
const { start: startScheduler } = require('../services/scheduler');

router.post('/connect', async (req, res) => {
     console.log("whatsapp route iniciado");
    const { userId } = req.body;
    const accessToken = req.headers.authorization?.split(' ')[1]; 

    console.log(`Requisição de conexão recebida para o usuário: ${userId}`);

    if (!userId) {
        return res.status(400).json({ error: 'ID do usuário é obrigatório.' });
    }
    
    if (!accessToken) {
        return res.status(401).json({ error: 'Token de autenticação é obrigatório.' });
    }

    try {
        // AQUI: Verificamos o status no Supabase antes de iniciar a sessão
        const { data, error } = await serviceRoleSupabase
            .from('whatsapp_sessions_2')
            .select('status')
            .eq('user_id', userId);

        
        console.log("data: ", data);

        if (error && error.code !== 'PGRST116') {
            console.error(`Erro do Supabase ao verificar status:`, error);
        }
        
        const sessionData = data?.[0] || null;

        if (sessionData && sessionData.status === 'connected') {
            console.log(`Sessão do usuário ${userId} já está conectada.`);
            
            // Inicia o agendador apenas quando o usuário está conectado
            startScheduler(userId); 
            
            return res.status(200).json({ message: 'O WhatsApp já está conectado.', status: 'connected' });
        }
        
        console.log(`Iniciando nova sessão do Venom para o usuário ${userId}...`);
        
        // AQUI: Chamamos a nova função que retorna o QR Code.
        console.log("QR code vai ser criado");
        const qrCode = await getQRCodeFromVenom(userId);

        console.log("qr code", qrCode)

        console.log("ver se excuta aqui");
        // Se o QR Code for recebido, enviamos a resposta ao cliente.
        res.status(200).json({ qrCode: qrCode, status: 'loading' });
        
        console.log(`QR Code enviado para o frontend com sucesso para o usuário ${userId}.`);
        
        // Inicia o agendador após o processo de conexão ser iniciado
        startScheduler(userId);
        
    } catch (error) {
        console.error('Erro fatal ao iniciar a conexão:', error);
        res.status(500).json({ error: 'Não foi possível iniciar a conexão. Tente novamente.' });
    }
});

module.exports = router;
