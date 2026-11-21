const { app, BrowserWindow } = require('electron');
const path = require('path');

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 420,
    minHeight: 600,
    title: 'QuickEntry - Data Entry & Excel Export',
    autoHideMenuBar: true, // Clean minimalist app look
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  // If running in development, load the local Vite dev server
  const devUrl = 'http://localhost:5173';
  const prodPath = path.join(__dirname, '../dist/index.html');

  if (process.env.NODE_ENV === 'development') {
    win.loadURL(devUrl).catch(() => {
      // If dev server not yet ready, retry shortly
      setTimeout(() => win.loadURL(devUrl), 1500);
    });
  } else {
    win.loadFile(prodPath);
  }
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
