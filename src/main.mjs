import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import { parseSave, findFiles, getClears, letterStatus, watchSave, parseStatics, c, getConfig, setConfig } from './lib.mjs';
import { readFileSync } from 'fs';
import { checkForUpdates, downloadLatest } from './updater.mjs';
import { version as loadedVersion } from './version.mjs';

async function handleFileOpen () {
  const { canceled, filePaths } = await dialog.showOpenDialog()
  if (!canceled) {
    return filePaths[0]
  }
}

const filePrompt = async ({save,data},parent) => {
  ipcMain.handle('dialog:openFile', handleFileOpen);
  const promptWin = new BrowserWindow({
    width: 600,
    height: 300,
    parent,
    modal:true,
    webPreferences: {
      preload: import.meta.dirname + '/prompt/preload.js'
    },
    icon: import.meta.dirname + '/public/holocure.ico'
  });
  let resolveTo;
  const result = new Promise(resolve => {
    resolveTo = resolve;
  })
  promptWin.loadFile('src/prompt/index.html');
  promptWin.webContents.on('did-finish-load', ()=>{
    promptWin.webContents.send('pre-fill', {save,data});
  });
  ipcMain.handle('hc-file:confirm', (_, newData)=>{
    save = newData.save;
    data = newData.data;
    promptWin.close();
  });
  ipcMain.handle('hc-file:cancel', ()=>{
    promptWin.close();
  });
  promptWin.on('close', () => {
    resolveTo({save,data});
  });
  return result;
}

const promptVersion = async (parent) => {
  const promptWin = new BrowserWindow({
    width: 420,
    height: 180,
    parent,
    modal:true,
    webPreferences: {
      preload: import.meta.dirname + '/updater/preload.js'
    },
    icon: import.meta.dirname + '/public/holocure.ico'
  });
  promptWin.loadFile('src/updater/index.html');
  let resolveTo;
  let choice = false;
  const result = new Promise(resolve => {
    resolveTo = resolve;
  })
  ipcMain.handle('choose', (_, decision)=>{
    if(!decision){
      promptWin.close();
    } else {
      promptWin.webContents.send('start-download');
      downloadLatest(app.getAppPath()).then(()=>{
        choice = true;
        promptWin.close();
      });
    }
  });
  promptWin.on('close', () => {
    resolveTo(choice);
  });
  return result;
}

const createWindow = async () => {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: import.meta.dirname + '/preload.js'
    },
    icon: import.meta.dirname + '/public/holocure.ico'
  });
  if(checkForUpdates(loadedVersion)){
    const downloaded = await promptVersion(win);
    if(downloaded){
      app.relaunch();
      app.exit();
    }
  }

  let dead = false;
  const { save } = await findFiles((dat)=>filePrompt(dat,win)).catch(()=>(dead = true));
  if(dead){
    win.close();
    return;
  }
  const rawSave = readFileSync(save).toString();
  const saveData = parseSave(rawSave);

  
  let config = getConfig();
  win.loadFile('src/index.html');
  win.webContents.on('did-finish-load', ()=>{
    win.webContents.send('versionLoaded', loadedVersion);
    win.webContents.send('saveUpdated', {saveData, staticData:parseStatics(saveData)});
    win.webContents.send('clearsUpdated', {full:getClears(saveData)});
    win.webContents.send('lettersUpdated', {full:letterStatus(saveData)});
    win.webContents.send('configUpdated', config);
  });

  ipcMain.handle('saveConfig', (_event, newConfig) => {
    config = newConfig;
    win.webContents.send('configUpdated', newConfig);
  })

  win.on('closed', () => {
    setConfig(config);
  })

  watchSave(save, (updatedSave, clear) => {
    win.webContents.send('saveUpdated', updatedSave);
    const added = {...clear};
    added.newChar = c(clear.newChar)
    win.webContents.send('clearsUpdated', {full:getClears(updatedSave), added});
  }, (updatedSave, letter) => {
    win.webContents.send('saveUpdated', updatedSave);
    win.webContents.send('lettersUpdated', {full:letterStatus(updatedSave), added:letter});
  });
}

app.whenReady().then(() => {
  createWindow();
})