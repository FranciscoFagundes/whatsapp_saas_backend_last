const cron = require('node-cron');
const { supabase } = require('../lib/supabase');
const { sendWhatsAppMessage } = require('../lib/venom');

const activeSchedulers = {};

const startScheduler = (userId) => {
    if (activeSchedulers[userId]) {
        console.log(`Agendador para o usuário ${userId} já está em execução. Pulando a inicialização.`);
        return;
    }
    
    activeSchedulers[userId] = cron.schedule('* * * * *', async () => {
        console.log('Verificando mensagens agendadas...');
        
        const now = new Date();
        
        try {
            // Buscamos mensagens agendadas com a informação do contato (JOIN)
            const { data: scheduledMessages, error } = await supabase
                .from('messages')
                .select(`
                    id, 
                    user_id, 
                    message, 
                    scheduled_time, 
                    contact_id, 
                    contacts (
                        phone_number
                    )
                `)
                .eq('user_id', userId)
                .eq('status', 'scheduled')
                .lte('scheduled_time', now.toISOString());
            
            if (error) {
                console.error(`Erro ao buscar mensagens agendadas do Supabase para o usuário ${userId}:`, error);
                return;
            }

            if (scheduledMessages && scheduledMessages.length > 0) {
                console.log(`Encontradas ${scheduledMessages.length} mensagens para enviar.`);
                for (const message of scheduledMessages) {
                    // AQUI: Verificamos se os dados do contato existem antes de continuar
                    if (message.contacts && message.contacts.phone_number) {
                        try {
                            // AQUI: Adicionamos o sufixo @c.us ao número de telefone para o Venom
                            const contactNumber = `${message.contacts.phone_number}@c.us`;
                            await sendWhatsAppMessage(message.user_id, contactNumber, message.message);
                            
                            await supabase
                                .from('messages')
                                .update({ status: 'sent' })
                                .eq('id', message.id);
                                
                        } catch (sendError) {
                            console.error(`Erro ao enviar mensagem ${message.id}:`, sendError);
                            
                            await supabase
                                .from('messages')
                                .update({ status: 'error' })
                                .eq('id', message.id);
                        }
                    } else {
                        console.error(`Erro: Contato não encontrado para a mensagem ${message.id}.`);
                        await supabase
                            .from('messages')
                            .update({ status: 'error' })
                            .eq('id', message.id);
                    }
                }
            } else {
                console.log('Nenhuma mensagem agendada encontrada.');
            }
        } catch (dbError) {
            console.error('Erro geral ao processar mensagens agendadas:', dbError);
        }
    });
};

module.exports = { start: startScheduler };
