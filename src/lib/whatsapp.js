// src/routes/whatsapp.js
const express = require('express');
const router = express.Router();
const { serviceRoleSupabase } = require('../lib/supabase');
const { getQRCodeFromVenom } = require('../lib/venom');
const { start: startScheduler } = require('../services/scheduler');

router.post('/connect', async (req, res) => {

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
        
        // AQUI: Aguardamos a promessa da função getQRCodeFromVenom.
        const qrCodeOrStatus = await getQRCodeFromVenom(userId);

        console.log("qrcode status: ", qrCodeOrStatus);

        // Se o resultado for um QR Code, enviamos para o frontend.
        if (typeof qrCodeOrStatus === 'string') {
            res.status(200).json({ qrCode: qrCodeOrStatus, status: 'loading' });
            console.log(`QR Code enviado para o frontend com sucesso para o usuário ${userId}.`);
        } else if (qrCodeOrStatus && qrCodeOrStatus.status === 'connected') {
            // Se o resultado indicar que a sessão já está conectada.
            res.status(200).json({ message: 'O WhatsApp já está conectado.', status: 'connected' });
        } else {
             // Caso a promessa seja resolvida de forma inesperada.
            res.status(500).json({ error: 'Não foi possível gerar o QR Code. Tente novamente.' });
        }
        
        // Inicia o agendador após o processo de conexão ser iniciado
        startScheduler(userId);
        
    } catch (error) {
        console.error('Erro fatal ao iniciar a conexão:', error);
        res.status(500).json({ error: 'Não foi possível iniciar a conexão. Tente novamente.' });
    }
});

module.exports = router;
