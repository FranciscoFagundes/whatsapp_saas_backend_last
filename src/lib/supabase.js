// src/lib/supabase.js
const { createClient } = require('@supabase/supabase-js');

// Configuração do Supabase (obtenha do seu painel)
const supabaseUrl = 'https://sccdmozcxaphuykdkazq.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNjY2Rtb3pjeGFwaHV5a2RrYXpxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUxNjUzNDMsImV4cCI6MjA3MDc0MTM0M30.jI2Bm1qt2W7lSmMfJ-zTnWXgDxT78yysemPxIaTclEY';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNjY2Rtb3pjeGFwaHV5a2RrYXpxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTE2NTM0MywiZXhwIjoyMDcwNzQxMzQzfQ.DUQ26DA6zylieHHXvGYCwStp6FTqkmWCi2Wls0bGS1Q';

// Cliente para uso com tokens de usuário (uso no frontend)
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Cliente para uso no backend com privilégios de administrador
const serviceRoleSupabase = createClient(supabaseUrl, supabaseServiceKey);

module.exports = {
    supabase,
    serviceRoleSupabase
};