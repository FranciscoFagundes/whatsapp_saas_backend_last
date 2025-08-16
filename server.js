const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { start: startScheduler } = require('./src/services/scheduler');
const whatsappRoutes = require('./src/routes/whatsapp');
const { supabase } = require('./src/lib/supabase');

const app = express();
const port = 3000;

app.use(cors());
app.use(bodyParser.json());

app.use('/whatsapp', whatsappRoutes);

// AQUI: A lógica de inicialização do agendador é removida
// do arranque do servidor. Ela será ativada na rota de conexão.
// startApp(); // <-- Removido

app.listen(port, () => {
    console.log(`Servidor rodando na porta ${port}`);
});
