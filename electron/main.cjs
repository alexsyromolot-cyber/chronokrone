/**
 * Chronokrone als Desktop-App (Electron).
 *
 * Lädt den fertigen Vite-Build aus dist/ (gebaut mit BASE_PATH=./, damit die Pfade relativ sind).
 * Spielstände liegen als echte Dateien im Benutzerordner der App (z. B.
 * %APPDATA%/Chronokrone/saves) statt im Browser-Speicher – siehe preload.cjs und
 * src/save/storage.ts (DesktopFileStorage).
 *
 * Sicherheit: kein Node im Renderer (contextIsolation, sandbox), nur drei kleine
 * Speicher-Funktionen über die Preload-Brücke; externe Links öffnen im System-Browser.
 */
const { app, BrowserWindow, ipcMain, Menu, shell } = require('electron');
const fs = require('node:fs');
const path = require('node:path');

const saveDir = () => path.join(app.getPath('userData'), 'saves');

// Nur einfache Schlüssel als Dateinamen erlauben – kein "../" aus dem Renderer.
function fileFor(key) {
  if (typeof key !== 'string' || !/^[\w.-]{1,64}$/.test(key)) throw new Error('ungültiger Schlüssel');
  return path.join(saveDir(), `${key}.json`);
}

ipcMain.on('save:get', (event, key) => {
  try {
    event.returnValue = fs.readFileSync(fileFor(key), 'utf8');
  } catch {
    event.returnValue = null;
  }
});

ipcMain.on('save:set', (event, key, value) => {
  try {
    fs.mkdirSync(saveDir(), { recursive: true });
    // Erst in eine Temp-Datei, dann umbenennen: ein Absturz mitten im Schreiben zerstört nie den Stand.
    const file = fileFor(key);
    fs.writeFileSync(`${file}.tmp`, String(value), 'utf8');
    fs.renameSync(`${file}.tmp`, file);
    event.returnValue = true;
  } catch {
    event.returnValue = false;
  }
});

ipcMain.on('save:remove', (event, key) => {
  try {
    fs.rmSync(fileFor(key), { force: true });
    event.returnValue = true;
  } catch {
    event.returnValue = false;
  }
});

function createWindow() {
  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 900,
    minHeight: 600,
    backgroundColor: '#121725',
    title: 'Chronokrone',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
    },
  });
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https://')) void shell.openExternal(url);
    return { action: 'deny' };
  });
  // Navigation weg vom Spiel verhindern (z. B. durch einen versehentlich gezogenen Link).
  win.webContents.on('will-navigate', (e) => e.preventDefault());
  void win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  if (process.env.CHRONOKRONE_SMOKE) smokeTest(win);
}

/**
 * Selbsttest (CHRONOKRONE_SMOKE=1): wartet, bis das Spiel „bereit“ meldet, speichert einmal
 * und prüft, dass die Speicherdatei entstanden ist. Ausgabe auf der Konsole, dann Ende.
 */
function smokeTest(win) {
  const started = Date.now();
  const timer = setInterval(async () => {
    const ready = await win.webContents
      .executeJavaScript(
        "document.body.dataset.ready === 'true' && (window.__chronokrone.save(), !!window.chronokroneDesktop)",
      )
      .catch(() => false);
    const files = fs.existsSync(saveDir()) ? fs.readdirSync(saveDir()) : [];
    if (ready && files.length > 0) {
      console.log(`SMOKE OK: Spiel bereit, Spielstände: ${files.join(', ')}`);
      clearInterval(timer);
      app.exit(0);
    } else if (Date.now() - started > 20000) {
      console.log('SMOKE FEHLER: Spiel nicht bereit oder kein Spielstand');
      clearInterval(timer);
      app.exit(1);
    }
  }, 500);
}

Menu.setApplicationMenu(null);
app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
