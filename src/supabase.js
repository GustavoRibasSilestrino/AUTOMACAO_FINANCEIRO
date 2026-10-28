import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const chave = import.meta.env.VITE_SUPABASE_ANON_KEY

// Sem .env preenchido o app roda em "modo local" (dados só neste computador).
export const REMOTO = Boolean(url && chave)
export const DOMINIO = import.meta.env.VITE_EMAIL_DOMAIN || 'painel.app'
export const supabase = REMOTO ? createClient(url, chave) : null
