const { contextBridge, ipcRenderer } = require('electron/renderer')

contextBridge.exposeInMainWorld('electronAPI', {
  onPreFill: (callback) => ipcRenderer.on('pre-fill', (_event, value) => callback(value)),
  openFile: () => ipcRenderer.invoke('dialog:openFile'),
  confirmFiles: (data) => ipcRenderer.invoke('hc-file:confirm',data),
  cancelFiles: () => ipcRenderer.invoke('hc-file:cancel'),
})