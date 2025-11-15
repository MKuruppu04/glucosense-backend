# GlucoSense Desktop App - Electron

## 🖥️ Overview

Cross-platform desktop application for Windows, macOS, and Linux using Electron.

---

## ✨ Features

### Planned Features:
- ✅ Same features as web app
- ✅ Native desktop notifications
- ✅ System tray integration
- ✅ Auto-start on system boot
- ✅ Offline mode with sync
- ✅ Auto-updates
- ✅ Native menus and shortcuts
- ✅ Multiple monitor support
- ✅ Export to local files
- ✅ Better performance than browser

---

## 🚀 Setup Instructions

### **Prerequisites:**

```bash
# Install Node.js 18+
node --version

# Install Electron globally (optional)
npm install -g electron
```

### **Create Electron App:**

```bash
# Navigate to desktop-app directory
cd c:\Users\User\CascadeProjects\personal-website\desktop-app

# Initialize project
npm init -y

# Install Electron
npm install --save-dev electron

# Install additional dependencies
npm install electron-store
npm install electron-updater
npm install electron-builder
```

### **Create package.json:**

```json
{
  "name": "glucosense-desktop",
  "version": "1.0.0",
  "description": "GlucoSense Desktop Application",
  "main": "main.js",
  "scripts": {
    "start": "electron .",
    "build": "electron-builder",
    "build:win": "electron-builder --windows",
    "build:mac": "electron-builder --mac",
    "build:linux": "electron-builder --linux"
  },
  "build": {
    "appId": "com.glucosense.app",
    "productName": "GlucoSense",
    "directories": {
      "buildResources": "assets"
    },
    "files": [
      "main.js",
      "preload.js",
      "renderer/**/*",
      "assets/**/*"
    ],
    "win": {
      "target": ["nsis", "portable"],
      "icon": "assets/icon.ico"
    },
    "mac": {
      "target": ["dmg", "zip"],
      "category": "public.app-category.healthcare-fitness",
      "icon": "assets/icon.icns"
    },
    "linux": {
      "target": ["AppImage", "deb"],
      "category": "Utility",
      "icon": "assets/icon.png"
    }
  },
  "keywords": ["glucose", "health", "monitoring"],
  "author": "GlucoSense Team",
  "license": "MIT"
}
```

---

## 📁 App Structure

```
desktop-app/
├── main.js              # Main process
├── preload.js           # Preload script
├── renderer/            # Renderer process (web files)
│   ├── index.html
│   ├── dashboard.html
│   ├── styles/
│   ├── scripts/
│   └── assets/
├── assets/
│   ├── icon.ico         # Windows icon
│   ├── icon.icns        # macOS icon
│   └── icon.png         # Linux icon
└── package.json
```

---

## 🔧 Main Process (main.js)

```javascript
const { app, BrowserWindow, Menu, Tray, ipcMain, Notification } = require('electron');
const path = require('path');
const Store = require('electron-store');
const { autoUpdater } = require('electron-updater');

const store = new Store();
let mainWindow;
let tray;

// Create main window
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    icon: path.join(__dirname, 'assets/icon.png'),
  });

  // Load the web app
  mainWindow.loadFile('renderer/index.html');

  // Open DevTools in development
  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools();
  }

  // Handle window close
  mainWindow.on('close', (event) => {
    if (!app.isQuitting) {
      event.preventDefault();
      mainWindow.hide();
    }
  });

  // Check for updates
  autoUpdater.checkForUpdatesAndNotify();
}

// Create system tray
function createTray() {
  tray = new Tray(path.join(__dirname, 'assets/icon.png'));
  
  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Show App',
      click: () => {
        mainWindow.show();
      },
    },
    {
      label: 'Latest Glucose',
      click: () => {
        // Show latest glucose reading
      },
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        app.isQuitting = true;
        app.quit();
      },
    },
  ]);

  tray.setContextMenu(contextMenu);
  tray.setToolTip('GlucoSense');

  tray.on('click', () => {
    mainWindow.show();
  });
}

// App ready
app.whenReady().then(() => {
  createWindow();
  createTray();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Quit when all windows closed (except macOS)
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// IPC handlers
ipcMain.handle('get-settings', () => {
  return store.get('settings', {});
});

ipcMain.handle('set-settings', (event, settings) => {
  store.set('settings', settings);
});

ipcMain.handle('show-notification', (event, { title, body }) => {
  new Notification({
    title,
    body,
    icon: path.join(__dirname, 'assets/icon.png'),
  }).show();
});

// Auto-updater events
autoUpdater.on('update-available', () => {
  mainWindow.webContents.send('update-available');
});

autoUpdater.on('update-downloaded', () => {
  mainWindow.webContents.send('update-downloaded');
});

ipcMain.on('restart-app', () => {
  autoUpdater.quitAndInstall();
});
```

---

## 🔐 Preload Script (preload.js)

```javascript
const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods to renderer process
contextBridge.exposeInMainWorld('electron', {
  // Settings
  getSettings: () => ipcRenderer.invoke('get-settings'),
  setSettings: (settings) => ipcRenderer.invoke('set-settings', settings),

  // Notifications
  showNotification: (title, body) =>
    ipcRenderer.invoke('show-notification', { title, body }),

  // Updates
  onUpdateAvailable: (callback) =>
    ipcRenderer.on('update-available', callback),
  onUpdateDownloaded: (callback) =>
    ipcRenderer.on('update-downloaded', callback),
  restartApp: () => ipcRenderer.send('restart-app'),
});
```

---

## 🎨 Renderer Process

The renderer process uses your existing web files:

```
renderer/
├── index.html          (copy from main project)
├── dashboard.html      (copy from main project)
├── login.html          (copy from main project)
├── styles/
└── scripts/
```

**Add Electron-specific code:**

```javascript
// In your renderer JavaScript
if (window.electron) {
  // Running in Electron

  // Show desktop notification for critical glucose
  if (glucose > 250 || glucose < 54) {
    window.electron.showNotification(
      'Critical Glucose Alert',
      `Your glucose is ${glucose} mg/dL!`
    );
  }

  // Check for updates
  window.electron.onUpdateAvailable(() => {
    alert('Update available! Downloading...');
  });

  window.electron.onUpdateDownloaded(() => {
    if (confirm('Update downloaded. Restart now?')) {
      window.electron.restartApp();
    }
  });
}
```

---

## 🚀 Development

### **Run in Development:**

```bash
npm start
```

### **Hot Reload:**

Install electron-reload:

```bash
npm install --save-dev electron-reload
```

Add to main.js:

```javascript
if (process.env.NODE_ENV === 'development') {
  require('electron-reload')(__dirname);
}
```

---

## 📦 Building for Distribution

### **Windows:**

```bash
npm run build:win

# Output:
# dist/GlucoSense Setup 1.0.0.exe
# dist/GlucoSense 1.0.0.exe (portable)
```

### **macOS:**

```bash
npm run build:mac

# Output:
# dist/GlucoSense-1.0.0.dmg
# dist/GlucoSense-1.0.0-mac.zip
```

### **Linux:**

```bash
npm run build:linux

# Output:
# dist/GlucoSense-1.0.0.AppImage
# dist/glucosense_1.0.0_amd64.deb
```

---

## 🔔 Native Notifications

```javascript
// In main.js
const { Notification } = require('electron');

function showCriticalAlert(glucose) {
  const notification = new Notification({
    title: '⚠️ Critical Glucose Alert',
    body: `Your glucose is ${glucose} mg/dL. Take action immediately!`,
    urgency: 'critical',
    sound: 'default',
  });

  notification.show();

  notification.on('click', () => {
    mainWindow.show();
    mainWindow.focus();
  });
}

// Listen from renderer
ipcMain.on('critical-glucose', (event, glucose) => {
  showCriticalAlert(glucose);
});
```

---

## 🎯 System Tray Features

```javascript
// Update tray with latest glucose
function updateTray(glucose) {
  tray.setTitle(`${glucose} mg/dL`);
  
  const status = glucose > 180 ? '🔴' : glucose < 70 ? '🟡' : '🟢';
  tray.setImage(path.join(__dirname, `assets/icon-${status}.png`));
}
```

---

## 🔄 Auto-Start on System Boot

```javascript
const AutoLaunch = require('auto-launch');

const glucosenseAutoLauncher = new AutoLaunch({
  name: 'GlucoSense',
  path: app.getPath('exe'),
});

// Enable auto-start
glucosenseAutoLauncher.enable();

// Disable auto-start
glucosenseAutoLauncher.disable();

// Check if enabled
glucosenseAutoLauncher.isEnabled().then((isEnabled) => {
  console.log('Auto-start:', isEnabled);
});
```

---

## 📊 App Signing & Distribution

### **Windows Code Signing:**

```bash
# Get code signing certificate
# Sign with electron-builder
electron-builder --win --publish never
```

### **macOS Code Signing:**

```bash
# Requires Apple Developer account ($99/year)
# Add to package.json:
"build": {
  "mac": {
    "identity": "Developer ID Application: Your Name (TEAM_ID)"
  }
}
```

### **Linux:**

No code signing required for Linux.

---

## 🌐 Auto-Update Configuration

**Set up update server or use GitHub Releases:**

```javascript
// In main.js
const { autoUpdater } = require('electron-updater');

autoUpdater.setFeedURL({
  provider: 'github',
  owner: 'your-username',
  repo: 'glucosense',
});

autoUpdater.checkForUpdatesAndNotify();
```

---

## 🎨 Custom Window

```javascript
// Frameless window with custom title bar
const mainWindow = new BrowserWindow({
  width: 1200,
  height: 800,
  frame: false,           // Remove default frame
  titleBarStyle: 'hidden',
  transparent: true,      // Optional: transparent background
  webPreferences: {
    preload: path.join(__dirname, 'preload.js'),
  },
});
```

---

## 📝 Next Steps

**To Build Full Desktop App:**
1. Copy web files to `renderer/` folder
2. Create `main.js` with Electron configuration
3. Create `preload.js` for security
4. Add desktop-specific features (tray, notifications)
5. Test on Windows, Mac, Linux
6. Build installers
7. Set up auto-updates
8. Distribute via website or app stores

**Estimated Time:** 3-5 days of development

---

## 🆘 Troubleshooting

**Issue: App won't build**
```bash
rm -rf node_modules package-lock.json
npm install
```

**Issue: Tray icon not showing**
- Ensure icon.png exists in assets/
- Use absolute path: `path.join(__dirname, 'assets/icon.png')`

**Issue: Auto-update not working**
- Must be code-signed for production
- Test with `electron-updater` documentation

---

## 🎯 Distribution Channels

1. **Your Website**: Host installers for download
2. **Microsoft Store**: Windows apps
3. **Mac App Store**: macOS apps (requires Apple Developer account)
4. **Snap Store**: Linux apps
5. **GitHub Releases**: For open-source distribution

---

Ready to build! The foundation is prepared. 🚀
