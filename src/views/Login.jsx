import { useState } from 'react'
import Icon from '../components/Icon.jsx'
import Logo from '../components/Logo.jsx'
import { REMOTO, entrar } from '../dados.js'
import { SETORES, OPERADORES_CAIXA, SENHAS } from '../store.js'

const ICONE_SETOR = { caixa: 'wallet', cancelamento: 'ban', certidoes: 'award', financeiro: 'shield' }
const OPCOES = [...Object.entries(SETORES), ['financeiro', 'Financeiro']]

export default function Login({ onEntrar, tema, alternarTema }) {
  const [setor, setSetor] = useState('caixa')
  const [operador, setOperador] = useState(OPERADORES_CAIXA[0])
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState('')
  const [entrando, setEntrando] = useState(false)

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
        <Logo invertido tamanho="lg" />
        <div className="login-texto">
          <h2>Conferência de pagamentos<br />em tempo real</h2>
          <ul>
            <li><Icon nome="wallet" /> O atendimento informa o valor recebido</li>
            <li><Icon nome="bell" /> O financeiro é avisado na hora, na tela</li>
            <li><Icon nome="checkCircle" /> Confirma no banco e o atendimento vê o resultado</li>
          </ul>
        </div>
        <small>Tabelionato de Protesto · Sorocaba</small>
      </section>

      <section className="login-form-lado">
        <button className="icone-btn login-tema" onClick={alternarTema} aria-label="Alternar tema">
          <Icon nome={tema === 'dark' ? 'sun' : 'moon'} />
        </button>
        <form onSubmit={submit} className="login-form">
          <h1>Entrar</h1>
          <p className="sub">Escolha o seu setor e digite a senha.</p>

          <div className="setores" role="radiogroup" aria-label="Setor">
            {OPCOES.map(([k, v]) => (
              <button type="button" key={k} role="radio" aria-checked={setor === k}
                className={`setor-card ${setor === k ? 'ativo' : ''}`}
                onClick={() => { setSetor(k); setErro('') }}>
                <Icon nome={ICONE_SETOR[k]} tam={20} />
                {v}
              </button>
            ))}
          </div>

          {setor === 'caixa' && (
            <div className="campo">
              <span className="rotulo">Atendente</span>
              <div className="chips">
                {OPERADORES_CAIXA.map((o) => (
                  <button type="button" key={o} className={`chip ${operador === o ? 'ativo' : ''}`}
                    onClick={() => setOperador(o)}>{o}</button>
                ))}
              </div>
            </div>
          )}

          <label className="campo">
            <span className="rotulo">Senha do setor</span>
            <input type="password" className="input" value={senha} autoFocus autoComplete="current-password"
              onChange={(e) => setSenha(e.target.value)} placeholder="••••••••" />
          </label>

          {erro && <p className="erro-msg"><Icon nome="alert" tam={16} /> {erro}</p>}

          <button className="btn primario grande" disabled={entrando || !senha}>
            {entrando ? <span className="spinner" /> : 'Entrar'}
          </button>
          {!REMOTO && (
            <p className="dica">Modo local (sem servidor) · senhas de teste: {Object.values(SENHAS).join(', ')}</p>
          )}
        </form>
      </section>
    </div>
  )
}
