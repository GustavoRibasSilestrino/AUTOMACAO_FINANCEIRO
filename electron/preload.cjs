const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('desktop', {
  // dados: null para limpar, ou { titulo, corpo, modo: 'canto' | 'janela' }
  perfil: (setor) => ipcRenderer.send('perfil', setor),
  alerta: (dados) => ipcRenderer.send('alerta', dados),
})
