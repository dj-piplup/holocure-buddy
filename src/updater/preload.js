const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    onStartDownload: (callback) => ipcRenderer.on('start-download', (_event, value) => callback(value)),
    sendDecision: (decision) => ipcRenderer.invoke('choose',decision),
});