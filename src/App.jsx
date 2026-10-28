import { useEffect, useMemo, useState } from 'react'
import { useConfigFinanceiro, lerSessao } from './store.js'
import {
  REMOTO, sair, restaurarSessao, aoEncerrarSessao, usePagamentos,
} from './dados.js'
import { useTema } from './hooks.js'
import { ToastProvider } from './components/Toasts.jsx'
import Shell from './components/Shell.jsx'
import PopUp from './components/PopUp.jsx'
import Logo from './components/Logo.jsx'
import Login from './views/Login.jsx'
import Atendimento from './views/Atendimento.jsx'
import Painel from './views/Painel.jsx'
import Historico from './views/Historico.jsx'
import Arquivos from './views/Arquivos.jsx'

export default function App() {
  const [tema, alternarTema] = useTema()
  // undefined = ainda verificando se já existe login salvo (só no modo Supabase)
  const [sessao, setSessao] = useState(() => (REMOTO ? undefined : lerSessao()))

  useEffect(() => {
    if (!REMOTO) return
    restaurarSessao().catch(() => null).then(setSessao)
    return aoEncerrarSessao(() => setSessao(null))
  }, [])

  const aoSair = async () => { await sair(); setSessao(null) }

  return (
    <ToastProvider>
      {sessao === undefined ? (
        <div className="splash"><Logo tamanho="lg" /></div>
      ) : !sessao ? (
        <Login onEntrar={setSessao} tema={tema} alternarTema={alternarTema} />
      ) : (
        <Aplicacao sessao={sessao} onSair={aoSair} tema={tema} alternarTema={alternarTema} />
      )}
    </ToastProvider>
  )
}

const TITULOS = { painel: 'Painel', pagamentos: 'Pagamentos', arquivos: 'Pesquisa de arquivos' }

function Aplicacao({ sessao, onSair, tema, alternarTema }) {
  const financeiro = sessao.setor === 'financeiro'
  const dados = usePagamentos() // uma única conexão compartilhada por todas as telas
  const { pagamentos, resolver, erro } = dados
  const [cfg, setCfg] = useConfigFinanceiro()
  const [tela, setTela] = useState(financeiro ? 'painel' : 'pagamentos')

  // Fila do financeiro: só os setores marcados neste computador
  const pendentes = useMemo(
    () => (financeiro
      ? pagamentos.filter((p) => p.status === 'pendente' && cfg.setores.includes(p.setor))
        .sort((a, b) => a.criadoEm - b.criadoEm)
      : []),
    [financeiro, pagamentos, cfg.setores],
  )
  const atual = financeiro && cfg.receber ? pendentes[0] : null

  // Título da janela mostra quantos estão aguardando (aparece na barra de tarefas)
  useEffect(() => {
    document.title = pendentes.length
      ? `(${pendentes.length}) Pagamento aguardando · Protesto Sorocaba`
      : 'Protesto Sorocaba · Pagamentos'
  }, [pendentes.length])

  const nav = financeiro
    ? [
      { id: 'painel', rotulo: 'Painel', icone: 'dashboard' },
      { id: 'pagamentos', rotulo: 'Pagamentos', icone: 'card', badge: pendentes.length },
      { id: 'arquivos', rotulo: 'Arquivos', icone: 'search' },
    ]
    : [
      { id: 'pagamentos', rotulo: 'Pagamentos', icone: 'card' },
      { id: 'arquivos', rotulo: 'Arquivos', icone: 'search' },
    ]

  return (
    <Shell sessao={sessao} nav={nav} tela={tela} onNav={setTela} onSair={onSair}
      tema={tema} alternarTema={alternarTema} titulo={TITULOS[tela]}>
      {tela === 'painel' && financeiro && (
        <Painel pagamentos={pagamentos} pendentes={pendentes} resolver={resolver}
          cfg={cfg} setCfg={setCfg} erro={erro} irPara={setTela} />
      )}
      {tela === 'pagamentos' && (financeiro
        ? <Historico pagamentos={pagamentos} resolver={resolver} />
        : <Atendimento sessao={sessao} dados={dados} />)}
      {tela === 'arquivos' && <Arquivos />}
      {atual && <PopUp p={atual} restantes={pendentes.length} resolver={resolver} erro={erro}
        estilo={cfg.estilo ?? 'canto'} />}
    </Shell>
  )
}
