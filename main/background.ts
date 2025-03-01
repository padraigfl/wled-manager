import {
  app,
  Tray,
  Menu,
  nativeImage,
  ipcMain
} from 'electron';
import serve from 'electron-serve';
import { createWindow } from './helpers';
import { DgramAsPromised } from "dgram-as-promised"
import installExtension, { REDUX_DEVTOOLS } from 'electron-devtools-installer';


const path = require('path');
const isProd: boolean = process.env.NODE_ENV === 'production';


if (isProd) {
  serve({ directory: 'app' });
} else {
  app.setPath('userData', `${app.getPath('userData')} (development)`);
}

let tray = null;

(async () => {
  await app.whenReady();


  app.commandLine.appendSwitch('disable-renderer-backgrounding');
  app.commandLine.appendSwitch('disable-background-timer-throttling');
  app.commandLine.appendSwitch('disable-backgrounding-occluded-windows');

  const mainWindow = createWindow('main', {
    width: 480,
    height: 800,
    titleBarStyle: "hidden",
    webPreferences: {
      contextIsolation: false,      
      enableRemoteModule: true,
      webSecurity: false,
      backgroundThrottling: false
    },
  });

  ipcMain.on('resize-me-please', (event, arg) => {
    mainWindow.setSize(arg[0], arg[1])
  })
  ipcMain.on('close', (event) => {
    app.quit();
  })

  let socket
  let PORT
  let message

  ipcMain.on('UDP-start', () => {
    socket = DgramAsPromised.createSocket("udp4")
    PORT = 21324
  })

  ipcMain.on('UDP', async (event, arg) => {
    message = Buffer.from(arg[1])
    await socket.send(message, 0, message.length, PORT, arg[0].ip)
  })
  ipcMain.on('UDP-stop', async () => {
    await socket.stop()
  })

  // tray = new Tray(nativeImage.createFromDataURL('data:image/x-icon;base64,AAABAAEAEBAAAAEAGACGAAAAFgAAAIlQTkcNChoKAAAADUlIRFIAAAAQAAAAEAgGAAAAH/P/YQAAAE1JREFUOI1j/P//PwOxgNGeAUMxE9G6cQCKDWAhpADZ2f8PMjBS3QW08QK20KaZC2gfC9hCnqouoNgARgY7zMxAyNlUdQHlXiAlO2MDAD63EVqNHAe0AAAAAElFTkSuQmCC'))


  const icon = nativeImage.createFromPath(path.join(__dirname, 'images/logo32.png')).resize({ width: 16, height: 16 })
  // const icon = isProd ? nativeImage.createFromPath('./images/logo256.png') : path.join(__dirname, 'images/logo256.png')
  tray = new Tray(icon)

  const contextMenu = Menu.buildFromTemplate([
    { label: 'Show', click: () => mainWindow.show() },
    { label: 'Minimize', click: () => mainWindow.minimize() },
    { label: 'Minimize to tray', click: () => mainWindow.hide() },
    // { label: 'Test Notifiation', click: () => showNotification() },
    { label: 'seperator', type: 'separator' },
    { label: 'Dev', click: () => mainWindow.webContents.openDevTools() },
    { label: 'seperator', type: 'separator' },
    { label: 'Exit', click: () => app.quit() }
  ])
  tray.setToolTip('WLED Manager')
  tray.setContextMenu(contextMenu)

  if (isProd) {
    await mainWindow.loadURL('app://./home.html');
    // mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    const port = process.argv[2];
    await mainWindow.loadURL(`http://localhost:${port}/home`);
    installExtension(REDUX_DEVTOOLS)
        .then((name) => console.log(`Added Extension:  ${name}`))
        .catch((err) => console.log('An error occurred: ', err));
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  }
})();

app.on('window-all-closed', () => {
  app.quit();
});
