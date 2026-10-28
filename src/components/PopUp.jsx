import { useEffect, useRef } from 'react'
import Icon from './Icon.jsx'
import Logo from './Logo.jsx'
import { useAgora } from '../hooks.js'
import { SETORES, brl, hora, duracao } from '../store.js'

// Pop-up persistente: só some quando alguém clica. Toca som e notificação do sistema.
export default function PopUp({ p, restantes, resolver, erro }) {
  const audioRef = useRef(null)
  const agora = useAgora()

  useEffect(() => {
    const beep = () => {
      try {
        const ctx = (audioRef.current ??= new AudioContext())
        const o = ctx.createOscillator()
        const g = ctx.createGain()
        o.frequency.value = 880
        g.gain.value = 0.15
        o.connect(g).connect(ctx.destination)
        o.start()
        o.stop(ctx.currentTime + 0.25)
      } catch { /* o navegador pode bloquear áudio até o 1º clique */ }
    }
    beep()
    const t = setInterval(beep, 4000)
    return () => clearInterval(t)
  }, [p.id])

  // No app de desktop: traz a janela para frente e pisca na barra enquanto houver pop-up
  useEffect(() => {
    window.desktop?.alerta(true)
    return () => window.desktop?.alerta(false)
  }, [p.id])

  useEffect(() => {
    if (!('Notification' in window) || Notification.permission !== 'granted') return
    const n = new Notification(`${SETORES[p.setor]}${p.operador ? ' · ' + p.operador : ''}`, {
      body: `${p.tipo} — ${brl(p.valor)}\nConfirme no banco.`,
      requireInteraction: true, // fica na tela até clicar
      tag: p.id,
    })
    n.onclick = () => window.focus()
    return () => n.close()
  }, [p.id])

  return (
    <div className="overlay" role="alertdialog" aria-modal="true" aria-label="Pagamento aguardando conferência">
      <div className="popup">
        <div className="popup-topo">
          <Logo tamanho="sm" />
          <span className="popup-fila">
            {restantes > 1 ? `${restantes} aguardando` : 'Novo pagamento'}
          </span>
        </div>

        <div className="popup-corpo">
          <span className="popup-anel"><Icon nome="bell" tam={26} /></span>
          <p className="popup-origem">{SETORES[p.setor]}{p.operador ? ` · ${p.operador}` : ''}</p>
          <p className="popup-valor">{brl(p.valor)}</p>
          <p className="popup-meta">{p.tipo} · informado às {hora(p.criadoEm)}</p>
          <p className="cronometro grande"><Icon nome="clock" tam={16} /> aguardando há {duracao(agora - p.criadoEm)}</p>
        </div>

        <p className="popup-dica">Confira no extrato do banco se este valor entrou.</p>
        {erro && <p className="erro-msg"><Icon nome="alert" tam={16} /> {erro}</p>}

        <div className="popup-acoes">
          <button className="btn sucesso grande" onClick={() => resolver(p.id, 'confirmado')}>
            <Icon nome="check" /> Valor recebido
          </button>
          <button className="btn perigo-suave grande" onClick={() => resolver(p.id, 'nao_recebido')}>
            Não localizei
          </button>
        </div>
      </div>
    </div>
  )
}
