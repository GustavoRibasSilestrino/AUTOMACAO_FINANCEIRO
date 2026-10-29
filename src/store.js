import { useEffect, useState } from 'react'

// ---- Constantes de negócio -------------------------------------------------
export const SETORES = {
  caixa: 'Caixa',
  cancelamento: 'Cancelamento',
  certidoes: 'Certidões',
}
export const OPERADORES_CAIXA = ['Biga', 'Particular', 'Renata']
export const TIPOS = [
  'Título em aberto',
  'Certidão',
  'Taxa de cancelamento',
  'Custas CPFL',
]

// SÓ MODO LOCAL (sem Supabase): senhas fixas de teste. Com Supabase, o login usa o Auth do servidor.
// Com o .env do Supabase preenchido, este objeto fica vazio e as senhas nem entram no instalador.
const SEM_SERVIDOR = !import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY
export const SENHAS = SEM_SERVIDOR
  ? { caixa: 'caixa123', cancelamento: 'cancel123', certidoes: 'cert123', financeiro: 'fin123' }
  : {}

// ---- Persistência (localStorage, sincroniza entre abas do mesmo navegador) --
const KEY_CFG = 'pp_financeiro_cfg'
const KEY_SESSAO = 'pp_sessao'

const ler = (key, fallback) => {
  try {
    return JSON.parse(localStorage.getItem(key)) ?? fallback
  } catch {
    return fallback
  }
}

export function useLocalStorage(key, fallback) {
  const [valor, setValor] = useState(() => ler(key, fallback))
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === key) setValor(ler(key, fallback))
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [key])
  const salvar = (novo) => {
    const v = typeof novo === 'function' ? novo(ler(key, fallback)) : novo
    localStorage.setItem(key, JSON.stringify(v))
    setValor(v)
  }
  return [valor, salvar]
}

// Configuração do financeiro (por computador): receber pop-up + setores
export const useConfigFinanceiro = () =>
  useLocalStorage(KEY_CFG, { receber: true, setores: Object.keys(SETORES) })

// Sessão: por aba
export const lerSessao = () => {
  try {
    return JSON.parse(sessionStorage.getItem(KEY_SESSAO))
  } catch {
    return null
  }
}
export const salvarSessao = (s) =>
  s
    ? sessionStorage.setItem(KEY_SESSAO, JSON.stringify(s))
    : sessionStorage.removeItem(KEY_SESSAO)

export const brl = (n) =>
  Number(n).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

export const hora = (t) =>
  new Date(t).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })

export const dataHora = (t) =>
  new Date(t).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })

export const STATUS = {
  pendente: { rotulo: 'Aguardando', tom: 'warn' },
  confirmado: { rotulo: 'Confirmado', tom: 'ok' },
  nao_recebido: { rotulo: 'Não localizado', tom: 'bad' },
  divergente: { rotulo: 'Valor diferente', tom: 'dif' },
  cancelado: { rotulo: 'Cancelado', tom: 'mudo' },
}

export const inicioDoDia = () => {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

// 75000 -> "01:15"; acima de 1 h -> "1h05"
export const duracao = (ms) => {
  const s = Math.max(0, Math.floor(ms / 1000))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  if (h) return `${h}h${String(m).padStart(2, '0')}`
  return `${String(m).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
}

// CSV em ponto-e-vírgula com BOM: abre direto no Excel em português
export function baixarCsv(nome, cabecalho, linhas) {
  const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`
  const csv = '﻿' + [cabecalho, ...linhas].map((l) => l.map(esc).join(';')).join('\r\n')
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
  const a = Object.assign(document.createElement('a'), { href: url, download: nome })
  document.body.append(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}
