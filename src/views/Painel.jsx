import { useMemo } from 'react'
import Icon from '../components/Icon.jsx'
import { Kpi, Switch, Vazio } from '../components/ui.jsx'
import { useAgora } from '../hooks.js'
import { SETORES, TIPOS, brl, hora, inicioDoDia, duracao } from '../store.js'

const SEGMENTOS = [
  { k: 'confirmado', rotulo: 'Confirmado', cls: 'ok' },
  { k: 'pendente', rotulo: 'Aguardando', cls: 'warn' },
  { k: 'nao_recebido', rotulo: 'Não localizado', cls: 'bad' },
]
const soma = (lista) => lista.reduce((s, p) => s + p.valor, 0)

export default function Painel({ pagamentos, pendentes, resolver, cfg, setCfg, erro, irPara }) {
  const agora = useAgora()
  const minuto = Math.floor(agora / 60000)

  const hoje = useMemo(() => {
    const ini = inicioDoDia()
    return pagamentos.filter((p) => p.criadoEm >= ini)
  }, [pagamentos, minuto])

  const confirmados = hoje.filter((p) => p.status === 'confirmado')
  const naoLoc = hoje.filter((p) => p.status === 'nao_recebido')
  const resolvidos = hoje.filter((p) => p.resolvidoEm)
  const tempoMedio = resolvidos.length
    ? resolvidos.reduce((s, p) => s + (p.resolvidoEm - p.criadoEm), 0) / resolvidos.length : null
  const maisAntigo = pendentes[0]

  const porSetor = Object.keys(SETORES).map((k) => {
    const doSetor = hoje.filter((p) => p.setor === k)
    const linha = { k, total: soma(doSetor), qtd: doSetor.length }
    for (const s of SEGMENTOS) linha[s.k] = soma(doSetor.filter((p) => p.status === s.k))
    return linha
  })
  const porTipo = TIPOS.map((t) => {
    const l = hoje.filter((p) => p.tipo === t)
    return { t, total: soma(l), qtd: l.length }
  })
  const maxSetor = Math.max(1, ...porSetor.map((s) => s.total))
  const maxTipo = Math.max(1, ...porTipo.map((s) => s.total))

  const alternarSetor = (s) =>
    setCfg({ ...cfg, setores: cfg.setores.includes(s) ? cfg.setores.filter((x) => x !== s) : [...cfg.setores, s] })

  const ativarReceber = async (ligado) => {
    setCfg({ ...cfg, receber: ligado })
    if (ligado && 'Notification' in window && Notification.permission === 'default') {
      await Notification.requestPermission()
    }
  }

  return (
    <>
      <div className="kpis">
        <Kpi icone="clock" tom="warn" rotulo="Aguardando" valor={pendentes.length}
          sub={maisAntigo ? `mais antigo há ${duracao(agora - maisAntigo.criadoEm)}` : 'tudo conferido'} />
        <Kpi icone="checkCircle" tom="ok" rotulo="Confirmado hoje" valor={brl(soma(confirmados))}
          sub={`${confirmados.length} pagamento${confirmados.length === 1 ? '' : 's'}`} />
        <Kpi icone="alert" tom="bad" rotulo="Não localizados hoje" valor={naoLoc.length}
          sub={naoLoc.length ? brl(soma(naoLoc)) : 'nenhum'} />
        <Kpi icone="timer" rotulo="Tempo médio" valor={tempoMedio == null ? '—' : duracao(tempoMedio)}
          sub={`${resolvidos.length} conferido${resolvidos.length === 1 ? '' : 's'} hoje`} />
      </div>

      {erro && <p className="erro-msg"><Icon nome="alert" tam={16} /> {erro}</p>}

      <div className="painel-grid">
        <section className="card span-2">
          <div className="card-head">
            <h2>Fila de conferência</h2>
            <button className="btn fantasma sm" onClick={() => irPara('pagamentos')}>Ver histórico</button>
          </div>
          {pendentes.length === 0 ? (
            <Vazio icone="checkCircle" titulo="Nada aguardando" texto="Quando um setor informar um valor, ele aparece aqui e em um pop-up." />
          ) : (
            <ul className="fila">
              {pendentes.map((p) => (
                <li key={p.id}>
                  <div className="grow">
                    <strong className="fila-valor">{brl(p.valor)}</strong>
                    <small>
                      {SETORES[p.setor]}{p.operador ? ` · ${p.operador}` : ''} · {p.tipo} · {hora(p.criadoEm)}
                    </small>
                  </div>
                  <span className="cronometro"><Icon nome="clock" tam={14} /> {duracao(agora - p.criadoEm)}</span>
                  <div className="acoes">
                    <button className="btn sucesso sm" onClick={() => resolver(p.id, 'confirmado')}>
                      <Icon nome="check" tam={16} /> Confirmar
                    </button>
                    <button className="btn perigo-suave sm" onClick={() => resolver(p.id, 'nao_recebido')}>
                      Não recebido
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card">
          <div className="card-head"><h2>Pop-ups neste computador</h2></div>
          <div className="config-linha">
            <div>
              <strong>Receber pop-ups</strong>
              <small>Janela que fica na tela até você clicar</small>
            </div>
            <Switch ligado={cfg.receber} aoMudar={ativarReceber} rotulo="Receber pop-ups" />
          </div>
          <span className="rotulo">Setores</span>
          <div className="chips">
            {Object.entries(SETORES).map(([k, v]) => (
              <button key={k} className={`chip ${cfg.setores.includes(k) ? 'ativo' : ''}`}
                onClick={() => alternarSetor(k)} aria-pressed={cfg.setores.includes(k)}>{v}</button>
            ))}
          </div>
          {'Notification' in window && Notification.permission === 'denied' && (
            <p className="dica">As notificações do Windows estão bloqueadas para este app. O pop-up na tela continua funcionando.</p>
          )}
        </section>

        <section className="card">
          <div className="card-head"><h2>Hoje por setor</h2></div>
          {hoje.length === 0 ? <p className="dica">Sem movimento hoje.</p> : (
            <>
              <div className="barras">
                {porSetor.map((s) => (
                  <div key={s.k} className="barra-linha">
                    <div className="barra-topo"><span>{SETORES[s.k]}</span><b>{brl(s.total)}</b></div>
                    <div className="barra">
                      <div className="barra-fill" style={{ width: `${(s.total / maxSetor) * 100}%` }}>
                        {SEGMENTOS.map((g) => s[g.k] > 0 && (
                          <span key={g.k} className={g.cls} style={{ flexGrow: s[g.k] }}
                            title={`${g.rotulo}: ${brl(s[g.k])}`} />
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="legenda">
                {SEGMENTOS.map((g) => <span key={g.k}><i className={`dot ${g.cls}`} />{g.rotulo}</span>)}
              </div>
            </>
          )}
        </section>

        <section className="card">
          <div className="card-head"><h2>Hoje por tipo</h2></div>
          {hoje.length === 0 ? <p className="dica">Sem movimento hoje.</p> : (
            <div className="barras">
              {porTipo.map((s) => (
                <div key={s.t} className="barra-linha">
                  <div className="barra-topo"><span>{s.t} <small>({s.qtd})</small></span><b>{brl(s.total)}</b></div>
                  <div className="barra">
                    <div className="barra-fill marca" style={{ width: `${(s.total / maxTipo) * 100}%` }}><span style={{ flexGrow: 1 }} /></div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </>
  )
}
