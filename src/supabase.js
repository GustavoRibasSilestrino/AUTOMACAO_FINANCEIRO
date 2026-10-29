import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const chave = import.meta.env.VITE_SUPABASE_ANON_KEY

// Sem .env preenchido o app roda em "modo local" (dados só neste computador).
export const REMOTO = Boolean(url && chave)
export const DOMINIO = import.meta.env.VITE_EMAIL_DOMAIN || 'painel.app'
// O login fica só na sessão da janela (sessionStorage): ao fechar o app, a sessão se perde e é preciso entrar de novo.
export const supabase = REMOTO
  ? createClient(url, chave, { auth: { storage: window.sessionStorage, persistSession: true, autoRefreshToken: true } })
  : null

// Remove logins salvos por versões antigas (que lembravam o login mesmo depois de fechar o app)
if (REMOTO) {
  try {
    Object.keys(localStorage).filter((k) => k.startsWith("sb-") || k === "pp_operador").forEach((k) => localStorage.removeItem(k))
  } catch { /* sem acesso ao storage */ }
}
