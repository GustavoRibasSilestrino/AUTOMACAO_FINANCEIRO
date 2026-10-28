import { useEffect, useState } from 'react'

// Relógio que "bate" a cada intervalo (cronômetros dos pagamentos pendentes)
export function useAgora(ms = 1000) {
  const [t, setT] = useState(Date.now)
  useEffect(() => {
    const i = setInterval(() => setT(Date.now()), ms)
    return () => clearInterval(i)
  }, [ms])
  return t
}

const KEY_TEMA = 'pp_tema'

const temaInicial = () => {
  try {
    const salvo = localStorage.getItem(KEY_TEMA)
    if (salvo) return salvo
  } catch { /* sem acesso ao storage */ }
  return matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export function useTema() {
  const [tema, setTema] = useState(temaInicial)
  useEffect(() => {
    document.documentElement.dataset.tema = tema
    try { localStorage.setItem(KEY_TEMA, tema) } catch { /* ignora */ }
  }, [tema])
  return [tema, () => setTema((t) => (t === 'dark' ? 'light' : 'dark'))]
}
