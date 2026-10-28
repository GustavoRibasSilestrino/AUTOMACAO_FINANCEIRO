const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('desktop', {
  // dados: null para limpar, ou { titulo, corpo, modo: 'canto' | 'janela' }
  alerta: (dados) => ipcRenderer.send('alerta', dados),
})
