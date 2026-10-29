// Camada de dados: fala com o Supabase (REMOTO) ou com o localStorage (modo local).
import { useCallback, useEffect, useState } from 'react'
import { supabase, REMOTO, DOMINIO } from './supabase.js'
import { OPERADORES, SENHAS, useLocalStorage, lerSessao, salvarSessao } from './store.js'

export { REMOTO }

const KEY_OPERADOR = 'pp_operador'

const msgErro = (e) =>
  /fetch|network|failed/i.test(e?.message ?? '') ? 'Sem conexão com o servidor.' : (e?.message ?? 'Erro desconhecido.')

// ------------------------------------------------------------------ sessão --
async function setorDoPerfil() {
  const { data, error } = await supabase.from('perfis').select('setor').maybeSingle()
  if (error) throw error
  return data?.setor ?? null
}

export async function entrar({ setor, operador, senha }) {
  if (!REMOTO) {
    if (senha !== SENHAS[setor]) throw new Error('Senha incorreta.')
    const s = { setor, operador: setor !== 'financeiro' ? operador : null }
    salvarSessao(s)
    return s
  }
  const { error } = await supabase.auth.signInWithPassword({ email: `${setor}@${DOMINIO}`, password: senha })
  if (error) {
    throw new Error(error.message === 'Invalid login credentials' ? 'Senha incorreta.' : msgErro(error))
  }
  const perfil = await setorDoPerfil().catch(() => null)
  if (perfil !== setor) {
    await supabase.auth.signOut()
    throw new Error('Usuário sem perfil de setor. Rode supabase/criar_perfis.sql.')
  }
  if (setor !== 'financeiro') localStorage.setItem(KEY_OPERADOR, operador)
  return { setor, operador: setor !== 'financeiro' ? operador : null }
}

export async function sair() {
  if (!REMOTO) return salvarSessao(null)
  localStorage.removeItem(KEY_OPERADOR)
  await supabase.auth.signOut()
}

// Caixa: troca o atendente sem sair (o login do setor continua o mesmo)
export function salvarOperador(op) {
  if (REMOTO) localStorage.setItem(KEY_OPERADOR, op)
  else salvarSessao({ ...lerSessao(), operador: op })
}

// Ao abrir o app: mantém o login anterior (importante para o PC do financeiro)
export async function restaurarSessao() {
  if (!REMOTO) return lerSessao()
  const { data } = await supabase.auth.getSession()
  if (!data.session) return null
  const setor = await setorDoPerfil()
  const operador = localStorage.getItem(KEY_OPERADOR)
  const precisaAtendente = setor !== 'financeiro'
  if (!setor || (precisaAtendente && !OPERADORES[setor]?.includes(operador))) {
    await supabase.auth.signOut()
    return null
  }
  return { setor, operador: precisaAtendente ? operador : null }
}

// Avisa se o login expirar ou for encerrado em outra aba
export function aoEncerrarSessao(cb) {
  if (!REMOTO) return () => {}
  const { data } = supabase.auth.onAuthStateChange((evento) => {
    if (evento === 'SIGNED_OUT') cb()
  })
  return () => data.subscription.unsubscribe()
}

// -------------------------------------------------------------- pagamentos --
const deRow = (r) => ({
  id: r.id,
  setor: r.setor,
  operador: r.operador,
  tipo: r.tipo,
  pagador: r.pagador ?? '(não informado)',
  valor: Number(r.valor),
  status: r.status,
  criadoEm: Date.parse(r.criado_em),
  resolvidoPor: r.resolvido_por,
  resolvidoEm: r.resolvido_em ? Date.parse(r.resolvido_em) : null,
  valorConferido: r.valor_conferido == null ? null : Number(r.valor_conferido), // só em "valor diferente"
})

function usePagamentosLocal() {
  const [pagamentos, salvar] = useLocalStorage('pp_pagamentos', [])
  const enviar = async (d) => {
    salvar((l) => [...l, {
      id: crypto.randomUUID(), ...d, criadoEm: Date.now(),
      status: 'pendente', resolvidoPor: null, resolvidoEm: null,
    }])
  }
  // status: confirmado | nao_recebido | divergente (extra.valorConferido) | cancelado. Devolve true se aplicou.
  const resolver = async (id, status, extra = {}) => {
    let aplicou = false
    salvar((l) => l.map((p) => {
      if (p.id !== id || p.status !== 'pendente') return p
      aplicou = true
      return { ...p, status, valorConferido: extra.valorConferido ?? null,
        resolvidoPor: status === 'cancelado' ? 'Setor' : 'Financeiro', resolvidoEm: Date.now() }
    }))
    return aplicou
  }
  return { pagamentos, enviar, resolver, erro: '' }
}

function usePagamentosRemoto() {
  const [pagamentos, setLista] = useState([])
  const [erro, setErro] = useState('')

  const carregar = useCallback(async () => {
    // Últimos 45 dias (os arquivos por dia usam isso), em páginas de 1000 (limite do servidor)
    const desde = new Date(Date.now() - 45 * 86400000).toISOString()
    const todos = []
    for (let pagina = 0; pagina < 5; pagina++) {
      const { data, error } = await supabase.from('pagamentos').select('*').gte('criado_em', desde)
        .order('criado_em', { ascending: false }).range(pagina * 1000, pagina * 1000 + 999)
      if (error) return setErro(msgErro(error))
      todos.push(...data)
      if (data.length < 1000) break
    }
    setErro('')
    setLista(todos.map(deRow))
  }, [])

  useEffect(() => {
    carregar()
    const canal = supabase
      .channel(`pagamentos-${crypto.randomUUID()}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pagamentos' }, ({ eventType, new: novo }) => {
        if (eventType === 'INSERT') setLista((l) => (l.some((p) => p.id === novo.id) ? l : [deRow(novo), ...l]))
        if (eventType === 'UPDATE') setLista((l) => l.map((p) => (p.id === novo.id ? deRow(novo) : p)))
      })
      // ao (re)conectar, recarrega: nada se perde se a internet cair um pouco
      .subscribe((status) => { if (status === 'SUBSCRIBED') carregar() })
    window.addEventListener('focus', carregar)
    const rede = setInterval(carregar, 30000) // rede de segurança caso o tempo real falhe em silêncio
    return () => {
      supabase.removeChannel(canal)
      window.removeEventListener('focus', carregar)
      clearInterval(rede)
    }
  }, [carregar])

  const enviar = async ({ setor, operador, tipo, valor, pagador }) => {
    const { data, error } = await supabase
      .from('pagamentos').insert({ setor, operador: operador ?? null, tipo, valor, pagador }).select().single()
    if (error) throw new Error(msgErro(error))
    setLista((l) => (l.some((p) => p.id === data.id) ? l : [deRow(data), ...l]))
  }

  // Devolve true se aplicou; false se já tinha sido resolvido por outra pessoa (ou deu erro).
  const resolver = async (id, status, extra = {}) => {
    const campos = { status }
    if (extra.valorConferido != null) campos.valor_conferido = extra.valorConferido
    const { data, error } = await supabase
      .from('pagamentos').update(campos).eq('id', id).eq('status', 'pendente').select()
    if (error) { setErro(msgErro(error)); return false }
    setErro('')
    if (!data.length) { await carregar(); return false }
    setLista((l) => l.map((p) => (p.id === id ? deRow(data[0]) : p)))
    return true
  }

  return { pagamentos, enviar, resolver, erro }
}

export const usePagamentos = REMOTO ? usePagamentosRemoto : usePagamentosLocal
