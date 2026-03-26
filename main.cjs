const { app, BrowserWindow } = require('electron');
const path = require('path');
const isDev = process.env.NODE_ENV === 'development';

// Disable hardware acceleration and GPU for maximum stability on older Macs
app.disableHardwareAcceleration();
app.commandLine.appendSwitch('disable-gpu');
app.commandLine.appendSwitch('disable-software-rasterizer');

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.cjs'),
      sandbox: true // Re-enable sandbox for security/stability
    },
    title: "QLBH - Phần mềm quản lý bán hàng",
  });

  win.once('ready-to-show', () => {
    win.show();
  });

  // In development, load from the dev server
  if (isDev) {
    win.loadURL('http://localhost:3000');
    win.webContents.openDevTools();
  } else {
    // In production, load the built index.html
    const indexPath = path.join(__dirname, 'dist/index.html');
    win.loadFile(indexPath).catch(err => {
      console.error("Failed to load app:", err);
    });
  }

  if (!isDev) {
    win.setMenu(null);
  }
}

// Handle potential errors during initialization
app.on('ready', () => {
  try {
    createWindow();
  } catch (e) {
    console.error("App initialization error:", e);
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
