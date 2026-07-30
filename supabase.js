/**
 * INICIALIZAÇÃO DO CLIENTE SUPABASE
 */
const SUPABASE_URL = 'https://wluwbgyskmopzlhvqjee.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_nfX0TkWB6xaAtugr_Zv8Mg_728zP2Yc';

// Cria a instância usando um nome único para não dar conflito de variável
window.supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
