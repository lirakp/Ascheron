// Windows-App: lädt das gebaute Spiel (eine einzige HTML-Datei) in ein eigenes Fenster.
const { app, BrowserWindow, Menu, shell } = require('electron');
const path = require('node:path');

// Spielstände (localStorage) landen in %APPDATA%\Ascheron
app.setName('Ascheron');

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 720,
    minWidth: 960,
    minHeight: 540,
    backgroundColor: '#000000',
    title: 'Ascheron',
    icon: path.join(__dirname, '..', 'build', 'icon.png'),
    autoHideMenuBar: true,
    show: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      // Ton darf ohne vorherigen Klick starten
      autoplayPolicy: 'no-user-gesture-required',
    },
  });
  win.once('ready-to-show', () => win.show());
  win.loadFile(path.join(__dirname, '..', 'dist', 'ascheron.html'));

  // F11 Vollbild, F12 Entwicklerwerkzeuge (nur ungepackt), Alt+Enter Vollbild
  win.webContents.on('before-input-event', (event, input) => {
    if (input.type !== 'keyDown') return;
    if (input.key === 'F11' || (input.alt && input.key === 'Enter')) { win.setFullScreen(!win.isFullScreen()); event.preventDefault(); }
    if (input.key === 'F12' && !app.isPackaged) win.webContents.toggleDevTools();
  });
  // Externe Links im Browser öffnen, nicht in der App
  win.webContents.setWindowOpenHandler(({ url }) => { shell.openExternal(url); return { action: 'deny' }; });
  win.webContents.on('will-navigate', (e, url) => { if (!url.startsWith('file://')) { e.preventDefault(); shell.openExternal(url); } });
}

Menu.setApplicationMenu(null);
app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
