import { useMemo, useState } from 'react'
import Icon from '../components/Icon.jsx'
import ValorDiferente from '../components/ValorDiferente.jsx'
import { Avatar, Donut, Kpi, Progresso, Switch, Vazio } from '../components/ui.jsx'
import { useAgora } from '../hooks.js'
import { baixarRelatorioDoDia } from '../relatorios.js'
import { OPERADORES, SETORES, TIPOS, brl, hora, inicioDoDia, duracao } from '../store.js'

const SEGMENTOS = [
  { k: 'confirmado', rotulo: 'Confirmado', cls: 'ok' },
  { k: 'pendente', rotulo: 'Aguardando', cls: 'warn' },
  { k: 'nao_recebido', rotulo: 'Não localizado', cls: 'bad' },
  { k: 'divergente', rotulo: 'Valor diferente', cls: 'dif' },
]
const soma = (lista) => lista.reduce((s, p) => s + p.valor, 0)

// Valor por hora nas últimas `horas` horas (para o mini gráfico)
const porHora = (lista, horas = 12) => {
  const base = new Date(); base.setMinutes(0, 0, 0)
  const baldes = Array(horas).fill(0)
  for (const p of lista) {
    const h = new Date(p.criadoEm); h.setMinutes(0, 0, 0)
    const i = horas - 1 - Math.round((base.getTime() - h.getTime()) / 3600000)
    if (i >= 0 && i < horas) baldes[i] += p.valor
  }
  return baldes
}

export default function Painel({ pagamentos, pendentes, resolver, cfg, setCfg, erro, irPara }) {
  const agora = useAgora()
  const minuto = Math.floor(agora / 60000)
  const [difId, setDifId] = useState(null) // pagamento da fila com o formulário "valor diferente" aberto

  const hoje = useMemo(() => {
    const ini = inicioDoDia()
    return pagamentos.filter((p) => p.criadoEm >= ini)
  }, [pagamentos, minuto])

  const confirmados = hoje.filter((p) => p.status === 'confirmado')
  const naoLoc = hoje.filter((p) => p.status === 'nao_recebido')
  const diferentes = hoje.filter((p) => p.status === 'divergente')
  const ativos = hoje.filter((p) => p.status !== 'cancelado') // cancelados ficam fora dos totais
  const resolvidos = ativos.filter((p) => p.resolvidoEm)
  const tempoMedio = resolvidos.length
    ? resolvidos.reduce((s, p) => s + (p.resolvidoEm - p.criadoEm), 0) / resolvidos.length : null
  const maisAntigo = pendentes[0]
  const problemas = naoLoc.length + diferentes.length

  const porSetor = Object.keys(SETORES).map((k) => {
    const doSetor = ativos.filter((p) => p.setor === k)
    const linha = { k, total: soma(doSetor), qtd: doSetor.length }
    for (const s of SEGMENTOS) linha[s.k] = soma(doSetor.filter((p) => p.status === s.k))
    return linha
  })
  const porTipo = TIPOS.map((t) => {
    const l = ativos.filter((p) => p.tipo === t)
    return { t, total: soma(l), qtd: l.length }
  })
  const porAtendente = Object.entries(OPERADORES)
    .flatMap(([setor, ops]) => ops.map((o) => {
      const l = ativos.filter((p) => p.setor === setor && p.operador === o)
      return { setor, nome: o, qtd: l.length, total: soma(l) }
    }))
    .filter((a) => a.qtd > 0)
    .sort((a, b) => b.total - a.total)
  const maxSetor = Math.max(1, ...porSetor.map((s) => s.total))
  const maxTipo = Math.max(1, ...porTipo.map((s) => s.total))
  const maxAtend = Math.max(1, ...porAtendente.map((a) => a.total))

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
          sub={`${confirmados.length} pagamento${confirmados.length === 1 ? '' : 's'}`}
          spark={porHora(confirmados)} />
        <Kpi icone="alert" tom="bad" rotulo="Com problema hoje" valor={problemas}
          sub={problemas
            ? `${naoLoc.length} não localizado${naoLoc.length === 1 ? '' : 's'} · ${diferentes.length} diferente${diferentes.length === 1 ? '' : 's'}`
            : 'nenhum'} />
        <Kpi icone="timer" rotulo="Tempo médio" valor={tempoMedio == null ? '—' : duracao(tempoMedio)}
          sub={`${resolvidos.length} conferido${resolvidos.length === 1 ? '' : 's'} hoje`} />
      </div>

      {erro && <p className="erro-msg"><Icon nome="alert" tam={16} /> {erro}</p>}

      <div className="bento">
        <section className="card bento-fila">
          <div className="card-head">
            <h2>Fila de conferência</h2>
            <div className="acoes">
              <button className="btn fantasma sm" onClick={() => baixarRelatorioDoDia(pagamentos)}>
                <Icon nome="download" tam={15} /> Relatório do dia
              </button>
              <button className="btn fantasma sm" onClick={() => irPara('pagamentos')}>Ver histórico</button>
            </div>
          </div>
          {pendentes.length === 0 ? (
            <Vazio icone="checkCircle" titulo="Nada aguardando" texto="Quando um setor informar um Pix, ele aparece aqui e em um aviso na tela." />
          ) : (
            <ul className="fila">
              {pendentes.map((p) => (
                <li key={p.id}>
                  <Avatar nome={p.pagador} tam={42} />
                  <div className="fila-info grow">
                    <strong>{p.pagador}</strong>
                    <small>{SETORES[p.setor]}{p.operador ? ` · ${p.operador}` : ''} · {p.tipo} · {hora(p.criadoEm)}</small>
                  </div>
                  <b className="fila-valor">{brl(p.valor)}</b>
                  <span className="cronometro"><Icon nome="clock" tam={14} /> {duracao(agora - p.criadoEm)}</span>
                  {difId === p.id ? (
                    <div className="dif-wrap">
                      <ValorDiferente p={p} resolver={resolver} aoVoltar={() => setDifId(null)} />
                    </div>
                  ) : (
                    <div className="acoes">
                      <button className="btn sucesso sm" onClick={() => resolver(p.id, 'confirmado')}>
                        <Icon nome="check" tam={16} /> Confirmar
                      </button>
                      <button className="btn fantasma sm" onClick={() => setDifId(p.id)}>Valor diferente</button>
                      <button className="btn perigo-suave sm" onClick={() => resolver(p.id, 'nao_recebido')}>
                        Não recebido
                      </button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card bento-status">
          <div className="card-head"><h2>Situação de hoje</h2></div>
          {ativos.length === 0 ? <p className="dica">Sem movimento hoje.</p> : (
            <>
              <Donut centro={brl(soma(ativos))} sub={`${ativos.length} pagamento${ativos.length === 1 ? '' : 's'}`}
                partes={SEGMENTOS.map((g) => ({ valor: soma(ativos.filter((p) => p.status === g.k)), cls: g.cls }))} />
              <ul className="legenda-lista">
                {SEGMENTOS.map((g) => {
                  const l = ativos.filter((p) => p.status === g.k)
                  return (
                    <li key={g.k}><i className={`dot ${g.cls}`} /><span>{g.rotulo}</span><b>{brl(soma(l))}</b><small>{l.length}</small></li>
                  )
                })}
              </ul>
            </>
          )}
        </section>

        <section className="card bento-3">
          <div className="card-head"><h2>Hoje por setor</h2></div>
          {ativos.length === 0 ? <p className="dica">Sem movimento hoje.</p> : (
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
            </>
          )}
        </section>

        <section className="card bento-3">
          <div className="card-head"><h2>Por atendente</h2></div>
          {porAtendente.length === 0 ? <p className="dica">Sem movimento hoje.</p> : (
            <ul className="ranking">
              {porAtendente.slice(0, 8).map((a) => (
                <li key={`${a.setor}-${a.nome}`}>
                  <Avatar nome={a.nome} tam={32} />
                  <div className="grow">
                    <div className="barra-topo"><span>{a.nome} <small>{SETORES[a.setor]} · {a.qtd}</small></span><b>{brl(a.total)}</b></div>
                    <Progresso valor={a.total} max={maxAtend} cls="marca" />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card bento-3">
          <div className="card-head"><h2>Hoje por tipo</h2></div>
          {ativos.length === 0 ? <p className="dica">Sem movimento hoje.</p> : (
            <div className="barras">
              {porTipo.map((s) => (
                <div key={s.t} className="barra-linha">
                  <div className="barra-topo"><span>{s.t} <small>({s.qtd})</small></span><b>{brl(s.total)}</b></div>
                  <Progresso valor={s.total} max={maxTipo} cls="marca" />
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="card bento-config">
          <div className="config-bloco">
            <div className="config-linha">
              <div>
                <strong>Receber avisos neste computador</strong>
                <small>Fica na tela até você conferir</small>
              </div>
              <Switch ligado={cfg.receber} aoMudar={ativarReceber} rotulo="Receber avisos" />
            </div>
          </div>
          <div className="config-bloco">
            <span className="rotulo">Setores</span>
            <div className="chips">
              {Object.entries(SETORES).map(([k, v]) => (
                <button key={k} className={`chip ${cfg.setores.includes(k) ? 'ativo' : ''}`}
                  onClick={() => alternarSetor(k)} aria-pressed={cfg.setores.includes(k)}>{v}</button>
              ))}
            </div>
          </div>
          <div className="config-bloco">
            {window.desktop ? (
              <>
                <span className="rotulo">Com o app em segundo plano</span>
                <div className="segmentado" role="group" aria-label="Como avisar">
                  {[['canto', 'Notificação no canto'], ['janela', 'Janela na frente']].map(([k, v]) => (
                    <button key={k} className={(cfg.estilo ?? 'canto') === k ? 'ativo' : ''}
                      onClick={() => setCfg({ ...cfg, estilo: k })}>{v}</button>
                  ))}
                </div>
              </>
            ) : (
              'Notification' in window && Notification.permission === 'denied' && (
                <p className="dica">Notificações bloqueadas neste navegador. O pop-up na tela continua funcionando.</p>
              )
            )}
          </div>
          {window.desktop && (
            <p className="dica config-dica">A notificação aparece no canto inferior direito e se repete a cada minuto até você conferir.
              Se não aparecer, confira se o Windows está em &quot;Não incomodar&quot; (Assistente de foco).</p>
          )}
        </section>
      </div>
    </>
  )
}
