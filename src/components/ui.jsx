import Icon from './Icon.jsx'
import { STATUS } from '../store.js'

export const StatusPill = ({ status }) => (
  <span className={`pill ${STATUS[status].tom}`}>
    <i className="dot" />
    {STATUS[status].rotulo}
  </span>
)

export const Kpi = ({ icone, rotulo, valor, sub, tom = 'neutro' }) => (
  <div className={`kpi ${tom}`}>
    <span className="kpi-icone"><Icon nome={icone} tam={20} /></span>
    <div>
      <p className="kpi-rotulo">{rotulo}</p>
      <p className="kpi-valor">{valor}</p>
      {sub && <p className="kpi-sub">{sub}</p>}
    </div>
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
