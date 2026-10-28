import { useEffect } from 'react'
import Icon from './Icon.jsx'
import Logo from './Logo.jsx'
import { REMOTO } from '../dados.js'
import { SETORES } from '../store.js'

export default function Shell({ sessao, nav, tela, onNav, onSair, tema, alternarTema, titulo, children }) {
  // Ctrl+K em qualquer tela abre a pesquisa de arquivos
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

  const nome = sessao.setor === 'financeiro' ? 'Financeiro' : (sessao.operador ?? SETORES[sessao.setor])
  const papel = sessao.setor === 'financeiro' ? 'Conferência bancária' : SETORES[sessao.setor]
  const hoje = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="sidebar-logo"><Logo invertido tamanho="md" /></div>

        <nav className="nav" aria-label="Principal">
          {nav.map((n) => (
            <button key={n.id} className={`nav-item ${tela === n.id ? 'ativo' : ''}`} onClick={() => onNav(n.id)}>
              <Icon nome={n.icone} />
              <span>{n.rotulo}</span>
              {n.badge > 0 && <b className="badge">{n.badge}</b>}
              {n.id === 'arquivos' && <kbd>Ctrl K</kbd>}
            </button>
          ))}
        </nav>

        <div className="side-foot">
          <div className="usuario">
            <span className="avatar">{nome[0]}</span>
            <div>
              <strong>{nome}</strong>
              <small>{papel}</small>
            </div>
          </div>
          <div className="side-acoes">
            <span className={`conexao ${REMOTO ? 'on' : ''}`} title={REMOTO ? 'Conectado ao servidor' : 'Dados só neste computador'}>
              <i className="dot" />{REMOTO ? 'Online' : 'Modo local'}
            </span>
            <button className="icone-btn" onClick={alternarTema} title="Alternar tema" aria-label="Alternar tema">
              <Icon nome={tema === 'dark' ? 'sun' : 'moon'} />
            </button>
            <button className="icone-btn" onClick={onSair} title="Sair" aria-label="Sair">
              <Icon nome="logout" />
            </button>
          </div>
        </div>
      </aside>

      <div className="main">
        <header className="topbar">
          <div>
            <h1>{titulo}</h1>
            <p className="data">{hoje}</p>
          </div>
        </header>
        <main className="page">{children}</main>
      </div>
    </div>
  )
}
