const { app, BrowserWindow, dialog } = require("electron");
const path = require("path");
const { autoUpdater } = require("electron-updater");

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 1100,
    minHeight: 720,
    backgroundColor: "#0f172a",
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.loadFile(
    path.join(__dirname,"..", "dist", "index.html")
  );
}

function setupAutoUpdater() {
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on("checking-for-update", () => {
    console.log("Checking for update...");
  });

  autoUpdater.on("update-available", (info) => {
    console.log("Update available:", info?.version);
  });

  autoUpdater.on("update-not-available", () => {
    console.log("No update available.");
  });

  autoUpdater.on("error", (err) => {
    console.error("Auto update error:", err);
  });

  autoUpdater.on("download-progress", (progressObj) => {
    console.log(
      `Downloaded ${progressObj.percent.toFixed(1)}% at ${progressObj.bytesPerSecond} bytes/s`
    );
  });

  autoUpdater.on("update-downloaded", async (info) => {
    const result = await dialog.showMessageBox({
      type: "info",
      buttons: ["Install Now", "Later"],
      defaultId: 0,
      cancelId: 1,
      title: "Update Ready",
      message: `FD Wealth Engine ${info.version} is ready to install.`,
      detail: "The app will restart to complete the update.",
    });

    if (result.response === 0) {
      autoUpdater.quitAndInstall();
    }
  });

  autoUpdater.checkForUpdatesAndNotify();
}

app.whenReady().then(() => {
  createWindow();
  setupAutoUpdater();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});