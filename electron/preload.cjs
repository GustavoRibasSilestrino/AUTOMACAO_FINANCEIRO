const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('desktop', {
  alerta: (ativo) => ipcRenderer.send('alerta', ativo),
})
