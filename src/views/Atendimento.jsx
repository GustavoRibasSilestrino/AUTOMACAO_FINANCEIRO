import { useEffect, useMemo, useRef, useState } from 'react'
import Icon from '../components/Icon.jsx'
import { StatusPill, Vazio } from '../components/ui.jsx'
import { useToast } from '../components/Toasts.jsx'
import { useAgora } from '../hooks.js'
import { SETORES, TIPOS, brl, hora, inicioDoDia, duracao } from '../store.js'
import { baixarMeusEnvios } from '../relatorios.js'

const ICONE_TIPO = {
  'Título em aberto': 'fileText',
  'Certidão': 'award',
  'Taxa de cancelamento': 'ban',
  'Custas CPFL': 'bolt',
}

export default function Atendimento({ sessao, dados }) {
  const { pagamentos, enviar, resolver, erro } = dados
  const toast = useToast()
  const agora = useAgora()
  const [tipo, setTipo] = useState(TIPOS[0])
  const [centavos, setCentavos] = useState(0)
  const [enviando, setEnviando] = useState(false)

  const minuto = Math.floor(agora / 60000)
  const meus = useMemo(() => {
    const ini = inicioDoDia()
    return pagamentos
      .filter((p) => p.setor === sessao.setor && (p.operador ?? null) === (sessao.operador ?? null) && p.criadoEm >= ini)
      .sort((a, b) => b.criadoEm - a.criadoEm)
  }, [pagamentos, sessao, minuto])

  // Avisa quando o financeiro responde a um pagamento que estava aguardando
  const vistos = useRef(new Map())
  useEffect(() => {
    for (const p of meus) {
      if (vistos.current.get(p.id) === 'pendente' && p.status !== 'pendente' && p.status !== 'cancelado') {
        const avisos = {
          confirmado: [`${brl(p.valor)} confirmado pelo financeiro.`, 'ok'],
          nao_recebido: [`${brl(p.valor)} NÃO foi localizado no banco. Fale com o financeiro.`, 'bad'],
          divergente: [`O financeiro encontrou ${brl(p.valorConferido)} no banco, mas você informou ${brl(p.valor)}. Fale com o financeiro.`, 'bad'],
        }
        toast(...avisos[p.status])
      }
      vistos.current.set(p.id, p.status)
    }
  }, [meus, toast])

  const submit = async (e) => {
    e.preventDefault()
    if (centavos <= 0 || enviando) return
    const valor = centavos / 100
    setEnviando(true)
    try {
      await enviar({ setor: sessao.setor, operador: sessao.operador, tipo, valor })
      setCentavos(0)
      toast(`${brl(valor)} enviado ao financeiro.`, 'ok')
    } catch (err) {
      toast(`Não enviado: ${err.message}`, 'bad')
    } finally {
      setEnviando(false)
    }
  }

  // Cancelar enquanto o financeiro ainda não conferiu (ex.: valor digitado errado)
  const cancelar = async (p) => {
    if (!window.confirm(`Cancelar o envio de ${brl(p.valor)} (${p.tipo})?`)) return
    if (await resolver(p.id, 'cancelado')) toast(`Envio de ${brl(p.valor)} cancelado.`)
    else toast('Não foi possível cancelar: o financeiro já conferiu este pagamento.', 'bad')
  }

  const ativos = meus.filter((p) => p.status !== 'cancelado') // cancelados ficam fora dos totais
  const total = ativos.reduce((s, p) => s + p.valor, 0)
  const aguardando = ativos.filter((p) => p.status === 'pendente').length

  return (
    <div className="duas-colunas">
      <section className="card">
        <div className="card-head">
          <div>
            <h2>Novo pagamento</h2>
            <p className="sub">Digite o valor recebido. O financeiro confere no banco.</p>
          </div>
        </div>

        <form onSubmit={submit}>
          <span className="rotulo">Tipo de pagamento</span>
          <div className="tipos" role="radiogroup" aria-label="Tipo de pagamento">
            {TIPOS.map((t) => (
              <button type="button" key={t} role="radio" aria-checked={tipo === t}
                className={`tipo-card ${tipo === t ? 'ativo' : ''}`} onClick={() => setTipo(t)}>
                <Icon nome={ICONE_TIPO[t]} tam={22} />
                {t}
              </button>
            ))}
          </div>

          <label className="campo">
            <span className="rotulo">Valor recebido</span>
            <input className="valor-input" inputMode="numeric" autoFocus placeholder="R$ 0,00"
              value={centavos ? brl(centavos / 100) : ''}
              onChange={(e) => setCentavos(Number(e.target.value.replace(/\D/g, '').slice(0, 11)))} />
          </label>

          <button className="btn primario grande" disabled={centavos <= 0 || enviando}>
            {enviando ? <span className="spinner" /> : <><Icon nome="send" /> Enviar ao financeiro</>}
          </button>
        </form>
      </section>

      <section className="card">
        <div className="card-head">
          <h2>Meus envios de hoje</h2>
          <button className="btn fantasma sm" disabled={!meus.length}
            onClick={() => baixarMeusEnvios(meus, sessao.operador ?? SETORES[sessao.setor])}>
            <Icon nome="download" tam={15} /> Baixar relatório
          </button>
        </div>
        <div className="mini-stats">
          <div><b>{ativos.length}</b><span>enviados</span></div>
          <div><b>{brl(total)}</b><span>total informado</span></div>
          <div><b>{aguardando}</b><span>aguardando</span></div>
        </div>
        {erro && <p className="erro-msg"><Icon nome="alert" tam={16} /> {erro}</p>}

        {meus.length === 0 ? (
          <Vazio icone="wallet" titulo="Nenhum envio ainda" texto="Os pagamentos que você informar aparecem aqui." />
        ) : (
          <ul className="linha-tempo">
            {meus.map((p) => (
              <li key={p.id} className={p.status}>
                <span className="tipo-icone"><Icon nome={ICONE_TIPO[p.tipo]} /></span>
                <div className="grow">
                  <strong>{brl(p.valor)}</strong>
                  <small>{p.tipo} · {hora(p.criadoEm)}</small>
                </div>
                <div className="direita">
                  <StatusPill status={p.status} />
                  <small>
                    {p.status === 'pendente'
                      ? `há ${duracao(agora - p.criadoEm)}`
                      : p.status === 'cancelado' ? 'cancelado por você'
                        : `em ${duracao(p.resolvidoEm - p.criadoEm)}`}
                  </small>
                  {p.status === 'divergente' && <small className="dif-info">Banco: {brl(p.valorConferido)}</small>}
                  {p.status === 'pendente' && (
                    <button className="link-btn" onClick={() => cancelar(p)}>Cancelar envio</button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
