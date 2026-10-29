import { useEffect, useState } from 'react'
import Icon from './Icon.jsx'
import Logo from './Logo.jsx'
import { Avatar } from './ui.jsx'
import Assinatura from './Assinatura.jsx'
import { REMOTO } from '../dados.js'
import { OPERADORES, SETORES } from '../store.js'

export default function Shell({
  sessao, nav, tela, onNav, onSair, onTrocarOperador, tema, alternarTema, titulo, pendentes = 0, children,
}) {
  // Menu lateral recolhido (só ícones): lembra a escolha neste computador
  const [compacto, setCompacto] = useState(() => {
    try { return localStorage.getItem('pp_menu') === '1' } catch { return false }
  })
  const alternarMenu = () => setCompacto((c) => {
    try { localStorage.setItem('pp_menu', c ? '0' : '1') } catch { /* ignora */ }
    return !c
  })

  // Ctrl+K em qualquer tela abre os arquivos
  useEffect(() => {
    const tecla = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        onNav('arquivos')
      }
    }
    window.addEventListener('keydown', tecla)
    return () => window.removeEventListener('keydown', tecla)
  }, [onNav])

  const financeiro = sessao.setor === 'financeiro'
  const operadores = OPERADORES[sessao.setor] ?? []
  const nome = sessao.operador ?? (financeiro ? 'Financeiro' : SETORES[sessao.setor])
  const papel = financeiro ? 'Financeiro · conferência' : SETORES[sessao.setor]
  const hoje = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })

  return (
    <div className={`app ${compacto ? 'compacto' : ''}`}>
      <aside className="sidebar">
        <div className="sidebar-logo">
          <Logo invertido tamanho="md" />
          <span className="monograma">PS</span>
        </div>

        <nav className="nav" aria-label="Principal">
          {nav.map((n) => (
            <button key={n.id} className={`nav-item ${tela === n.id ? 'ativo' : ''}`} onClick={() => onNav(n.id)}
              title={n.rotulo}>
              <Icon nome={n.icone} />
              <span className="nav-rotulo">{n.rotulo}</span>
              {n.badge > 0 && <b className="badge">{n.badge}</b>}
            </button>
          ))}
        </nav>

        <div className="side-foot">
          <div className="usuario" title={`${nome} · ${papel}`}>
            <Avatar nome={nome} tam={38} />
            <div className="usuario-texto">
              <strong>{nome}</strong>
              <small>{papel}</small>
            </div>
          </div>
          <div className="side-linha">
            <span className={`conexao ${REMOTO ? 'on' : ''}`} title={REMOTO ? 'Conectado ao servidor' : 'Dados só neste computador'}>
              <i className="dot" /><span className="conexao-texto">{REMOTO ? 'Online' : 'Modo local'}</span>
            </span>
            <button className="icone-btn escuro" onClick={alternarMenu} aria-label="Recolher menu"
              title={compacto ? 'Expandir menu' : 'Recolher menu'}>
              <Icon nome={compacto ? 'chevRight' : 'chevLeft'} tam={16} />
            </button>
          </div>
        </div>
      </aside>

      <div className="main">
        <header className="topbar">
          <div className="topbar-logo"><Logo tamanho="sm" /></div>
          <div className="topbar-titulo">
            <h1>{titulo}</h1>
            <p className="data">{hoje}</p>
          </div>
          <div className="topbar-acoes">
            {operadores.length > 1 && (
              <label className="atendente" title="Trocar de atendente (não precisa sair)">
                <Icon nome="user" tam={16} />
                <select value={sessao.operador} onChange={(e) => onTrocarOperador(e.target.value)} aria-label="Atendente">
                  {operadores.map((o) => <option key={o}>{o}</option>)}
                </select>
              </label>
            )}
            <button className="busca-atalho" onClick={() => onNav('arquivos')} title="Arquivos de pagamentos (Ctrl K)">
              <Icon nome="search" tam={16} />
              <span>Arquivos</span>
              <kbd>Ctrl K</kbd>
            </button>
            {financeiro && (
              <button className={`sino ${pendentes ? 'ativo' : ''}`} onClick={() => onNav('pagamentos')}
                aria-label={`${pendentes} pagamento(s) aguardando`} title={`${pendentes} aguardando conferência`}>
                <Icon nome="bell" tam={18} />
                {pendentes > 0 && <b>{pendentes}</b>}
              </button>
            )}
            <button className="icone-btn" onClick={alternarTema} title="Alternar tema" aria-label="Alternar tema">
              <Icon nome={tema === 'dark' ? 'sun' : 'moon'} tam={18} />
            </button>
            <button className="icone-btn" onClick={onSair} title="Sair" aria-label="Sair">
              <Icon nome="logout" tam={18} />
            </button>
          </div>
        </header>
        <main className="page">{children}</main>
        <footer className="rodape"><Assinatura /></footer>
      </div>

      <nav className="bottom-nav" aria-label="Principal (celular)">
        {nav.map((n) => (
          <button key={n.id} className={tela === n.id ? 'ativo' : ''} onClick={() => onNav(n.id)}>
            <Icon nome={n.icone} tam={20} />
            <span>{n.rotulo}</span>
            {n.badge > 0 && <b className="badge">{n.badge}</b>}
          </button>
        ))}
      </nav>
    </div>
  )
}
