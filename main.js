const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const isDev = process.env.NODE_ENV === 'development';
const database = require('./src/database');

class MainApp {
  constructor() {
    this.mainWindow = null;
  }

  createWindow() {
    this.mainWindow = new BrowserWindow({
      width: 1200,
      height: 800,
      minWidth: 800,
      minHeight: 600,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        enableRemoteModule: false,
        preload: path.join(__dirname, 'preload.js'),
      },
      titleBarStyle: 'default',
      show: false,
    });

    if (isDev) {
      this.mainWindow.loadURL('http://localhost:5173');
      this.mainWindow.webContents.openDevTools();
    } else {
      this.mainWindow.loadFile(path.join(__dirname, 'dist/index.html'));
    }

    this.mainWindow.once('ready-to-show', () => {
      this.mainWindow.show();
    });

    this.mainWindow.on('closed', () => {
      this.mainWindow = null;
    });
  }

  setupIPC() {
    ipcMain.handle('projects:getAll', async () => {
      try {
        return database.getProjects();
      } catch (error) {
        console.error('Failed to get projects:', error);
        throw error;
      }
    });

    ipcMain.handle('projects:create', async (_, name, description) => {
      try {
        return database.createProject(name, description);
      } catch (error) {
        console.error('Failed to create project:', error);
        throw error;
      }
    });

    ipcMain.handle('projects:get', async (_, id) => {
      try {
        return database.getProject(id);
      } catch (error) {
        console.error('Failed to get project:', error);
        throw error;
      }
    });

    ipcMain.handle('projects:delete', async (_, id) => {
      try {
        return database.deleteProject(id);
      } catch (error) {
        console.error('Failed to delete project:', error);
        throw error;
      }
    });

    // Database viewer IPC handlers
    ipcMain.handle('db:getTables', async () => {
      try {
        return database.getTables();
      } catch (error) {
        console.error('Failed to get tables:', error);
        throw error;
      }
    });

    ipcMain.handle('db:getTableSchema', async (_, tableName) => {
      try {
        return database.getTableSchema(tableName);
      } catch (error) {
        console.error('Failed to get table schema:', error);
        throw error;
      }
    });

    ipcMain.handle('db:getTableData', async (_, tableName) => {
      try {
        return database.getTableData(tableName);
      } catch (error) {
        console.error('Failed to get table data:', error);
        throw error;
      }
    });
  }

  async initialize() {
    await app.whenReady();

    try {
      database.init();
      this.setupIPC();
      this.createWindow();
    } catch (error) {
      console.error('Failed to initialize app:', error);
      app.quit();
    }

    app.on('window-all-closed', () => {
      if (process.platform !== 'darwin') {
        database.close();
        app.quit();
      }
    });

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        this.createWindow();
      }
    });

    app.on('before-quit', () => {
      database.close();
    });
  }
}

const mainApp = new MainApp();
mainApp.initialize().catch(console.error);