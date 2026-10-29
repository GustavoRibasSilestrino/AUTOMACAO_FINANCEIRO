import { useState } from 'react'
import Icon from '../components/Icon.jsx'
import Logo from '../components/Logo.jsx'
import Assinatura from '../components/Assinatura.jsx'
import { REMOTO, entrar } from '../dados.js'
import { SETORES, OPERADORES, SENHAS } from '../store.js'

const ICONE_SETOR = { caixa: 'wallet', cancelamento: 'ban', certidoes: 'award', financeiro: 'shield' }
const DESCRICAO = {
  caixa: 'Atendimento físico',
  cancelamento: 'Taxas de cancelamento',
  certidoes: 'Pagamento de certidões',
  financeiro: 'Conferência no banco',
}
const OPCOES = [...Object.entries(SETORES), ['financeiro', 'Financeiro']]

export default function Login({ onEntrar, tema, alternarTema }) {
  const [setor, setSetor] = useState('caixa')
  const [operador, setOperador] = useState(OPERADORES.caixa[0])
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState('')
  const [entrando, setEntrando] = useState(false)
  const atendentes = OPERADORES[setor] ?? []

  const escolherSetor = (k) => {
    setSetor(k)
    setOperador(OPERADORES[k]?.[0] ?? null)
    setErro('')
  }

  const submit = async (e) => {
    e.preventDefault()
    setErro('')
    setEntrando(true)
    try {
      onEntrar(await entrar({ setor, operador, senha }))
    } catch (err) {
      setErro(err.message)
      setEntrando(false)
    }
  }

  return (
    <div className="login">
      <section className="login-marca">
        <span className="brilho b1" /><span className="brilho b2" />
        <Logo invertido tamanho="lg" />
        <div className="login-texto">
          <p className="login-selo"><Icon nome="shield" tam={14} /> Conferência de Pix em tempo real</p>
          <h2>Cada Pix informado,<br />conferido na hora.</h2>
          <ul>
            <li><span><Icon nome="wallet" tam={18} /></span> O atendimento informa o pagador e o valor</li>
            <li><span><Icon nome="bell" tam={18} /></span> O financeiro é avisado na tela, na hora</li>
            <li><span><Icon nome="checkCircle" tam={18} /></span> Confirma no banco e todos veem o resultado</li>
          </ul>
        </div>
        <small>Tabelionato de Protesto · Sorocaba</small>
      </section>

      <section className="login-form-lado">
        <button className="icone-btn login-tema" onClick={alternarTema} aria-label="Alternar tema">
          <Icon nome={tema === 'dark' ? 'sun' : 'moon'} />
        </button>
        <form onSubmit={submit} className="login-form">
          <div className="login-logo-mobile"><Logo tamanho="md" /></div>
          <h1>Entrar</h1>
          <p className="sub">Escolha o seu setor e digite a senha.</p>

          <div className="setores" role="radiogroup" aria-label="Setor">
            {OPCOES.map(([k, v]) => (
              <button type="button" key={k} role="radio" aria-checked={setor === k}
                className={`setor-card ${setor === k ? 'ativo' : ''}`} onClick={() => escolherSetor(k)}>
                <span className="setor-icone"><Icon nome={ICONE_SETOR[k]} tam={20} /></span>
                <span><strong>{v}</strong><small>{DESCRICAO[k]}</small></span>
              </button>
            ))}
          </div>

          {atendentes.length > 0 && (
            <div className="campo">
              <span className="rotulo">Atendente</span>
              <div className="chips">
                {atendentes.map((o) => (
                  <button type="button" key={o} className={`chip ${operador === o ? 'ativo' : ''}`}
                    onClick={() => setOperador(o)}>{o}</button>
                ))}
              </div>
            </div>
          )}

          <label className="campo">
            <span className="rotulo">Senha do setor</span>
            <span className="input-icone">
              <Icon nome="lock" tam={18} />
              <input type="password" className="input" value={senha} autoFocus autoComplete="current-password"
                onChange={(e) => setSenha(e.target.value)} placeholder="••••••••" />
            </span>
          </label>

          {erro && <p className="erro-msg"><Icon nome="alert" tam={16} /> {erro}</p>}

          <button className="btn primario grande" disabled={entrando || !senha}>
            {entrando ? <span className="spinner" /> : 'Entrar'}
          </button>
          {!REMOTO && (
            <p className="dica">Modo local (sem servidor) · senhas de teste: {Object.values(SENHAS).join(', ')}</p>
          )}
          <Assinatura className="login-assinatura" />
        </form>
      </section>
    </div>
  )
}
