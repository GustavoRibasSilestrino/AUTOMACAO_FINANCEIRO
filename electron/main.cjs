const { app, BrowserWindow, Tray, Menu, ipcMain, nativeImage } = require('electron')
const path = require('path')
const criarAviso = require('./aviso.cjs')

const DEV_URL = process.env.DEV_URL // ex.: http://localhost:5173 (npm run desktop:dev)
let win = null
let tray = null
let saindo = false

// Só uma instância por computador (senão haveria dois pop-ups iguais)
if (!app.requestSingleInstanceLock()) app.quit()
app.on('second-instance', () => mostrar())

function mostrar() {
  if (!win) return
  if (win.isMinimized()) win.restore()
  win.show() // reabre também se estava escondido na bandeja
  win.moveTop()
  win.focus()
}

function criarJanela() {
  win = new BrowserWindow({
    width: 1000,
    height: 720,
    minWidth: 480,
    title: 'Painel de Pagamentos',
    icon: path.join(__dirname, '..', 'build', 'icon.png'),
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      backgroundThrottling: false, // com a janela escondida, o som e o relógio do pop-up continuam
    },
  })
  if (DEV_URL) win.loadURL(DEV_URL)
  else win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'))

  // Fechar a janela só esconde (o financeiro precisa continuar recebendo pop-ups)
  win.on('close', (e) => {
    if (!saindo) { e.preventDefault(); win.hide() }
  })
}

function criarBandeja() {
  const icone = nativeImage.createFromPath(path.join(__dirname, '..', 'build', 'icon.png')).resize({ width: 16, height: 16 })
  tray = new Tray(icone)
  tray.setToolTip('Painel de Pagamentos')
  tray.on('click', mostrar)
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: 'Abrir', click: mostrar },
    {
      label: 'Iniciar com o Windows',
      type: 'checkbox',
      checked: app.getLoginItemSettings().openAtLogin,
      click: (item) => app.setLoginItemSettings({ openAtLogin: item.checked }),
    },
    { type: 'separator' },
    { label: 'Sair', click: () => { saindo = true; app.quit() } },
  ]))
}

// Pagamento aguardando: notificação no canto da tela ou janela por cima (ver aviso.cjs)
const aviso = criarAviso({ janela: () => win, mostrar })
ipcMain.on('alerta', (_e, dados) => aviso.ativar(dados))

app.whenReady().then(() => {
  app.setAppUserModelId('br.com.painelpagamentos') // necessário para notificações no Windows
  criarJanela()
  criarBandeja()
})

app.on('before-quit', () => { saindo = true })
