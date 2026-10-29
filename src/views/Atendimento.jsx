import { useEffect, useMemo, useRef, useState } from 'react'
import Icon from '../components/Icon.jsx'
import { Avatar, StatusPill, Vazio } from '../components/ui.jsx'
import { useToast } from '../components/Toasts.jsx'
import { useAgora } from '../hooks.js'
import {
  ESCOPO_POR_ATENDENTE, TIPOS_POR_SETOR, brl, doEscopo, duracao, escopoRotulo, hora, inicioDoDia, pagadorValido,
} from '../store.js'
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
  const tipos = TIPOS_POR_SETOR[sessao.setor]
  const [tipo, setTipo] = useState(tipos[0])
  const [pagador, setPagador] = useState('')
  const [centavos, setCentavos] = useState(0)
  const [enviando, setEnviando] = useState(false)
  const nomeRef = useRef(null)

  const minuto = Math.floor(agora / 60000)
  const meus = useMemo(() => {
    const ini = inicioDoDia()
    return pagamentos.filter((p) => doEscopo(p, sessao) && p.criadoEm >= ini).sort((a, b) => b.criadoEm - a.criadoEm)
  }, [pagamentos, sessao, minuto])

  // Avisa quando o financeiro responde a um pagamento que estava aguardando
  const vistos = useRef(new Map())
  useEffect(() => {
    for (const p of meus) {
      if (vistos.current.get(p.id) === 'pendente' && p.status !== 'pendente' && p.status !== 'cancelado') {
        const avisos = {
          confirmado: [`${brl(p.valor)} de ${p.pagador} confirmado pelo financeiro.`, 'ok'],
          nao_recebido: [`${brl(p.valor)} de ${p.pagador} NÃO foi localizado no banco. Fale com o financeiro.`, 'bad'],
          divergente: [`O financeiro encontrou ${brl(p.valorConferido)} no banco, mas você informou ${brl(p.valor)} (${p.pagador}). Fale com o financeiro.`, 'bad'],
        }
        toast(...avisos[p.status])
      }
      vistos.current.set(p.id, p.status)
    }
  }, [meus, toast])

  const valido = pagadorValido(pagador) && centavos > 0

  const submit = async (e) => {
    e.preventDefault()
    if (!valido || enviando) return
    const valor = centavos / 100
    const nome = pagador.trim()
    setEnviando(true)
    try {
      await enviar({ setor: sessao.setor, operador: sessao.operador, tipo, valor, pagador: nome })
      setCentavos(0)
      setPagador('')
      nomeRef.current?.focus()
      toast(`Pix de ${nome} (${brl(valor)}) enviado ao financeiro.`, 'ok')
    } catch (err) {
      toast(`Não enviado: ${err.message}`, 'bad')
    } finally {
      setEnviando(false)
    }
  }

  // Cancelar enquanto o financeiro ainda não conferiu (ex.: valor digitado errado)
  const cancelar = async (p) => {
    if (!window.confirm(`Cancelar o envio de ${brl(p.valor)} de ${p.pagador} (${p.tipo})?`)) return
    if (await resolver(p.id, 'cancelado')) toast(`Envio de ${brl(p.valor)} (${p.pagador}) cancelado.`)
    else toast('Não foi possível cancelar: o financeiro já conferiu este pagamento.', 'bad')
  }

  const ativos = meus.filter((p) => p.status !== 'cancelado') // cancelados ficam fora dos totais
  const total = ativos.reduce((s, p) => s + p.valor, 0)
  const aguardando = ativos.filter((p) => p.status === 'pendente').length
  const confirmados = ativos.filter((p) => p.status === 'confirmado').length
  const porAtendente = Boolean(ESCOPO_POR_ATENDENTE[sessao.setor])

  return (
    <div className="duas-colunas">
      <section className="card form-card">
        <div className="card-head">
          <div>
            <h2>Novo pagamento</h2>
            <p className="sub">Informe quem pagou e o valor do Pix. O financeiro confere no banco.</p>
          </div>
        </div>

        <form onSubmit={submit}>
          {tipos.length > 1 ? (
            <>
              <span className="rotulo">Tipo de pagamento</span>
              <div className="tipos" role="radiogroup" aria-label="Tipo de pagamento">
                {tipos.map((t) => (
                  <button type="button" key={t} role="radio" aria-checked={tipo === t}
                    className={`tipo-card ${tipo === t ? 'ativo' : ''}`} onClick={() => setTipo(t)}>
                    <Icon nome={ICONE_TIPO[t]} tam={22} />
                    {t}
                  </button>
                ))}
              </div>
            </>
          ) : (
            <div className="tipo-unico">
              <span className="tipo-icone"><Icon nome={ICONE_TIPO[tipos[0]]} tam={20} /></span>
              <div><small>Tipo de pagamento</small><strong>{tipos[0]}</strong></div>
            </div>
          )}

          <label className="campo">
            <span className="rotulo">Nome do pagador <b className="obrigatorio">obrigatório</b></span>
            <input ref={nomeRef} className="input grande" autoFocus autoComplete="off" maxLength={120}
              placeholder="Nome de quem fez o Pix" value={pagador} onChange={(e) => setPagador(e.target.value)} />
          </label>

          <label className="campo">
            <span className="rotulo">Valor do Pix</span>
            <input className="valor-input" inputMode="numeric" placeholder="R$ 0,00" aria-label="Valor do Pix"
              value={centavos ? brl(centavos / 100) : ''}
              onChange={(e) => setCentavos(Number(e.target.value.replace(/\D/g, '').slice(0, 11)))} />
          </label>

          <div className={`resumo-pix ${valido ? 'pronto' : ''}`}>
            {valido ? (
              <>
                <Avatar nome={pagador} tam={38} />
                <div className="grow">
                  <strong>{pagador.trim()}</strong>
                  <small>{tipo}</small>
                </div>
                <b>{brl(centavos / 100)}</b>
              </>
            ) : (
              <p><Icon nome="alert" tam={16} /> Preencha o nome do pagador e o valor para enviar.</p>
            )}
          </div>

          <button className="btn primario grande" disabled={!valido || enviando}>
            {enviando ? <span className="spinner" /> : <><Icon nome="send" /> Enviar ao financeiro</>}
          </button>
        </form>
      </section>

      <section className="card lista-card">
        <div className="hero-total">
          <div>
            <small>Total de Pix hoje</small>
            <strong>{brl(total)}</strong>
            <span>{escopoRotulo(sessao)}{porAtendente ? '' : ' · todos os atendentes'}</span>
          </div>
          <button className="btn fantasma sm" disabled={!meus.length}
            onClick={() => baixarMeusEnvios(meus, escopoRotulo(sessao))}>
            <Icon nome="download" tam={15} /> Baixar relatório
          </button>
        </div>

        <div className="mini-stats">
          <div><b>{ativos.length}</b><span>enviados</span></div>
          <div><b>{aguardando}</b><span>aguardando</span></div>
          <div><b>{confirmados}</b><span>confirmados</span></div>
        </div>
        {erro && <p className="erro-msg"><Icon nome="alert" tam={16} /> {erro}</p>}

        {meus.length === 0 ? (
          <Vazio icone="wallet" titulo="Nenhum envio ainda" texto="Os pagamentos que você informar aparecem aqui." />
        ) : (
          <ul className="linha-tempo">
            {meus.map((p) => (
              <li key={p.id} className={p.status}>
                <Avatar nome={p.pagador} tam={40} />
                <div className="grow">
                  <strong>{p.pagador}</strong>
                  <small>{p.tipo} · {hora(p.criadoEm)}{porAtendente ? '' : ` · ${p.operador ?? ''}`}</small>
                </div>
                <div className="direita">
                  <b className="li-valor">{brl(p.valor)}</b>
                  <StatusPill status={p.status} />
                  <small>
                    {p.status === 'pendente'
                      ? `há ${duracao(agora - p.criadoEm)}`
                      : p.status === 'cancelado' ? 'cancelado'
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
