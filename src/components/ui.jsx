import Icon from './Icon.jsx'
import { STATUS } from '../store.js'

export const StatusPill = ({ status }) => (
  <span className={`pill ${STATUS[status].tom}`}>
    <i className="dot" />
    {STATUS[status].rotulo}
  </span>
)

// Círculo com as iniciais; a cor vem do nome (o mesmo nome sempre tem a mesma cor)
export function Avatar({ nome = '?', tam = 36 }) {
  let h = 0
  for (const c of nome) h = (h * 31 + c.charCodeAt(0)) % 360
  const iniciais = nome.trim().split(/\s+/).slice(0, 2).map((s) => s[0]).join('').toUpperCase()
  return (
    <span className="avatar-nome" aria-hidden="true"
      style={{ width: tam, height: tam, fontSize: Math.round(tam * 0.38), '--h': h }}>
      {iniciais || '?'}
    </span>
  )
}

// Mini gráfico de linha (valores já calculados)
export function Sparkline({ valores, cor = 'var(--primario)' }) {
  const n = valores.length
  const max = Math.max(...valores, 1)
  const pontos = valores.map((v, i) => `${(i / Math.max(n - 1, 1)) * 100},${29 - (v / max) * 25}`).join(' ')
  return (
    <svg className="spark" viewBox="0 0 100 32" preserveAspectRatio="none" aria-hidden="true">
      <polygon points={`0,32 ${pontos} 100,32`} fill={cor} opacity=".13" />
      <polyline points={pontos} fill="none" stroke={cor} strokeWidth="2" vectorEffect="non-scaling-stroke"
        strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  )
}

// Rosca: partes = [{ valor, cls }]
export function Donut({ partes, centro, sub }) {
  const total = partes.reduce((s, p) => s + p.valor, 0)
  let acumulado = 0
  return (
    <div className="donut">
      <svg viewBox="0 0 42 42" role="img" aria-label="Distribuição dos pagamentos de hoje">
        <circle className="donut-fundo" cx="21" cy="21" r="15.915" fill="none" strokeWidth="5" />
        {total > 0 && partes.filter((p) => p.valor > 0).map((p) => {
          const pct = (p.valor / total) * 100
          const el = (
            <circle key={p.cls} className={`donut-parte ${p.cls}`} cx="21" cy="21" r="15.915" fill="none"
              strokeWidth="5" strokeDasharray={`${Math.max(pct - 0.8, 0)} ${100 - Math.max(pct - 0.8, 0)}`}
              strokeDashoffset={25 - acumulado} />
          )
          acumulado += pct
          return el
        })}
      </svg>
      <div className="donut-centro">
        <strong>{centro}</strong>
        <small>{sub}</small>
      </div>
    </div>
  )
}

export const Progresso = ({ valor, max, cls = '' }) => (
  <div className="progresso"><span className={cls} style={{ width: `${Math.min(100, (valor / (max || 1)) * 100)}%` }} /></div>
)

export const Kpi = ({ icone, rotulo, valor, sub, tom = 'neutro', spark }) => (
  <div className={`kpi ${tom}`}>
    <div className="kpi-topo">
      <span className="kpi-icone"><Icon nome={icone} tam={18} /></span>
      <p className="kpi-rotulo">{rotulo}</p>
    </div>
    <p className="kpi-valor">{valor}</p>
    {sub && <p className="kpi-sub">{sub}</p>}
    {spark && <Sparkline valores={spark} cor="currentColor" />}
  </div>
)

export const Switch = ({ ligado, aoMudar, rotulo }) => (
  <button type="button" role="switch" aria-checked={ligado} aria-label={rotulo}
    className={`switch ${ligado ? 'on' : ''}`} onClick={() => aoMudar(!ligado)}>
    <span />
  </button>
)

export const Vazio = ({ icone, titulo, texto }) => (
  <div className="vazio">
    <span className="vazio-icone"><Icon nome={icone} tam={26} /></span>
    <strong>{titulo}</strong>
    {texto && <p>{texto}</p>}
  </div>
)
