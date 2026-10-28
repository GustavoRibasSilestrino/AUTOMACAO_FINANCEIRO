import { createContext, useCallback, useContext, useState } from 'react'
import Icon from './Icon.jsx'

const Ctx = createContext(() => {})
export const useToast = () => useContext(Ctx)

const ICONE = { ok: 'checkCircle', bad: 'alert', info: 'bell' }

export function ToastProvider({ children }) {
  const [itens, setItens] = useState([])

  const toast = useCallback((texto, tom = 'info') => {
    const id = crypto.randomUUID()
    setItens((l) => [...l, { id, texto, tom }])
    setTimeout(() => setItens((l) => l.filter((i) => i.id !== id)), 7000)
  }, [])

  return (
    <Ctx.Provider value={toast}>
      {children}
      <div className="toasts" role="status" aria-live="polite">
        {itens.map((i) => (
          <div key={i.id} className={`toast ${i.tom}`}>
            <Icon nome={ICONE[i.tom]} tam={20} />
            <span>{i.texto}</span>
          </div>
        ))}
      </div>
    </Ctx.Provider>
  )
}
