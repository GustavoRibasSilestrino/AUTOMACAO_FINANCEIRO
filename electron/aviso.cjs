// Avisos de pagamento aguardando, no app de desktop.
//  - modo 'canto'  : notificação do Windows (canto inferior direito), sem tirar o foco do que a pessoa
//                    está fazendo (ex.: site do banco). Fica até ser fechada e é repetida a cada minuto
//                    enquanto houver pagamento aguardando. Clicar nela traz o app para a frente.
//  - modo 'janela' : o app vem para a frente, fica por cima de tudo e pisca na barra de tarefas.
// Se o app já está na frente, nenhum aviso externo é necessário: o pop-up aparece dentro dele.
const { Notification } = require('electron')

const REPETIR_MS = 60 * 1000

module.exports = function criarAviso({ janela, mostrar }) {
  let notif = null
  let timer = null

  const viva = () => {
    const w = janela()
    return w && !w.isDestroyed() ? w : null
  }
  const naFrente = () => {
    const w = viva()
    return Boolean(w && w.isVisible() && !w.isMinimized() && w.isFocused())
  }

  const notificar = ({ titulo, corpo }) => {
    if (naFrente() || !Notification.isSupported()) return
    notif?.close()
    notif = new Notification({ title: titulo, body: corpo, timeoutType: 'never', urgency: 'critical' })
    notif.on('click', mostrar)
    notif.show()
    viva()?.flashFrame(true)
  }

  const parar = () => {
    clearInterval(timer)
    timer = null
    notif?.close()
    notif = null
    const w = viva()
    if (w) {
      w.setAlwaysOnTop(false)
      w.flashFrame(false)
    }
  }

  // dados: null (limpar) ou { titulo, corpo, modo }
  const ativar = (dados) => {
    parar()
    if (!dados || typeof dados.titulo !== 'string' || typeof dados.corpo !== 'string') return
    if (dados.modo === 'janela') {
      mostrar()
      const w = viva()
      w?.setAlwaysOnTop(true, 'screen-saver')
      w?.flashFrame(true)
      return
    }
    notificar(dados)
    timer = setInterval(() => notificar(dados), REPETIR_MS)
  }

  return { ativar, parar, notificar, atual: () => notif }
}
