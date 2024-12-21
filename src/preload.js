const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  onVersionLoaded: (callback) => ipcRenderer.on('versionLoaded', (_event, value) => callback(value)),
  onSaveUpdated: (callback) => ipcRenderer.on('saveUpdated', (_event, value) => callback(value)),
  onLetters: (callback) => ipcRenderer.on('lettersUpdated', (_event, value) => callback(value)),
  onClears: (callback) => ipcRenderer.on('clearsUpdated', (_event, value) => callback(value)),
  onConfig: (callback) => ipcRenderer.on('configUpdated', (_event, value) => callback(value)),
  updateConfig: (config) => ipcRenderer.invoke('saveConfig', config)
});