/* Supabase: la clave publishable/anon puede vivir en el frontend.
   La seguridad se implementa con RLS y Edge Functions. */
const SUPABASE_URL = 'https://izdgejkvmvixpmjrxkku.supabase.co';
const SUPABASE_KEY = 'sb_publishable_U1ASo9v8wi1JGJYyEO67ZQ_bIo2oOsv';

if (!window.supabase || !SUPABASE_URL || !SUPABASE_KEY) {
    throw new Error('No se pudo inicializar Supabase.');
}

const _supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
});
