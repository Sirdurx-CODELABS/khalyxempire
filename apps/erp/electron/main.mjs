import { app, BrowserWindow } from 'electron';

const url = process.env.ERP_URL || 'http://localhost:5175/erp/';

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    backgroundColor: '#0d0d0d',
    webPreferences: { contextIsolation: true }
  });
  win.loadURL(url);
}

app.whenReady().then(createWindow);
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
