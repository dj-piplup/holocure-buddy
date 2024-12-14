const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  onSaveUpdated: (callback) => ipcRenderer.on('saveUpdated', (_event, value) => callback(value)),
  onLetters: (callback) => ipcRenderer.on('lettersUpdated', (_event, value) => callback(value)),
  onClears: (callback) => ipcRenderer.on('clearsUpdated', (_event, value) => callback(value))
});