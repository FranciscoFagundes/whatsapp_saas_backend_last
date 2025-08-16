// src/routes/whatsapp.js
const express = require('express');
const router = express.Router();
const { supabase, serviceRoleSupabase } = require('../lib/supabase'); // Importa os dois clientes
const { createVenomSession } = require('../lib/venom');
const { start: startScheduler } = require('../services/scheduler'); // Importa o agendador

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
        // AQUI: Usamos o cliente com a chave de serviço para verificar o status
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
            
            return res.status(200).json({ message: 'O WhatsApp já está conectado.' });
        }
        
        console.log(`Iniciando nova sessão do Venom para o usuário ${userId}...`);
        
        // AQUI: Passamos o cliente com a chave de serviço para a função

        await createVenomSession(userId, serviceRoleSupabase);

        // Inicia o agendador após o processo de conexão ser iniciado
        startScheduler(userId);
        
        console.log(`Processo de conexão iniciado com sucesso para o usuário ${userId}.`);
        res.status(200).json({ message: 'Processo de conexão iniciado. Verifique o QR Code na tela.' });
    } catch (error) {
        console.error('Erro fatal ao iniciar a conexão:', error);
        res.status(500).json({ error: 'Não foi possível iniciar a conexão. Tente novamente.' });
    }
});

module.exports = router;
