// Load path first to resolve .env location
const path = require('path');

// Register ts-node for TypeScript support
require('ts-node').register({
  transpileOnly: true,
  compilerOptions: {
    module: 'commonjs',
    target: 'ES2020',
    moduleResolution: 'node',
    esModuleInterop: true,
    allowSyntheticDefaultImports: true,
    skipLibCheck: true
  }
});

// Load environment variables BEFORE any other imports
// In Electron, __dirname is the app's root directory
const dotenv = require('dotenv');
const envPath = path.resolve(__dirname, '.env');
console.log('[main.js] Loading .env from:', envPath);
const result = dotenv.config({ path: envPath });

if (result.error) {
  console.error('[main.js] Error loading .env:', result.error);
} else {
  console.log('[main.js] .env loaded successfully');
  console.log('[main.js] ANTHROPIC_API_KEY present:', !!process.env.ANTHROPIC_API_KEY);
}

const { app, BrowserWindow, ipcMain } = require('electron');
const isDev = process.env.NODE_ENV === 'development';
const database = require('./src/database');

// Import the new TypeScript agent (ts-node registered above)
const valuationAgent = require('./src/services/valuationAgent.ts').default;

// Inject database into valuation agent
valuationAgent.setDatabase(database);

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

  validateEnvironment() {
    const missingVars = [];

    if (!process.env.ANTHROPIC_API_KEY) {
      missingVars.push('ANTHROPIC_API_KEY');
    }

    if (missingVars.length > 0) {
      const errorMsg = `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚠️  CONFIGURATION ERROR
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Missing required environment variables:
${missingVars.map(v => `  • ${v}`).join('\n')}

Please create a .env file in the project root with:

ANTHROPIC_API_KEY=sk-ant-your-api-key-here

See .env.example for reference.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      `;
      console.error(errorMsg);
      throw new Error(`Missing environment variables: ${missingVars.join(', ')}`);
    }

    console.log('✓ Environment variables validated');
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

    // Methods IPC handlers
    ipcMain.handle('methods:create', async (_, projectId, methodType, weight) => {
      try {
        return database.createMethod(projectId, methodType, weight);
      } catch (error) {
        console.error('Failed to create method:', error);
        throw error;
      }
    });

    ipcMain.handle('methods:getByProject', async (_, projectId) => {
      try {
        return database.getMethodsByProject(projectId);
      } catch (error) {
        console.error('Failed to get methods:', error);
        throw error;
      }
    });

    ipcMain.handle('methods:update', async (_, id, data) => {
      try {
        return database.updateMethod(id, data);
      } catch (error) {
        console.error('Failed to update method:', error);
        throw error;
      }
    });

    ipcMain.handle('methods:delete', async (_, id) => {
      try {
        return database.deleteMethod(id);
      } catch (error) {
        console.error('Failed to delete method:', error);
        throw error;
      }
    });

    // Metrics IPC handlers
    ipcMain.handle('metrics:create', async (_, methodId, key, value, type) => {
      try {
        return database.createMetric(methodId, key, value, type);
      } catch (error) {
        console.error('Failed to create metric:', error);
        throw error;
      }
    });

    ipcMain.handle('metrics:createBatch', async (_, methodId, metricsData) => {
      try {
        return database.createMetrics(methodId, metricsData);
      } catch (error) {
        console.error('Failed to create metrics:', error);
        throw error;
      }
    });

    ipcMain.handle('metrics:getByMethod', async (_, methodId) => {
      try {
        return database.getMetricsByMethod(methodId);
      } catch (error) {
        console.error('Failed to get metrics:', error);
        throw error;
      }
    });

    ipcMain.handle('metrics:update', async (_, id, value) => {
      try {
        return database.updateMetric(id, value);
      } catch (error) {
        console.error('Failed to update metric:', error);
        throw error;
      }
    });

    ipcMain.handle('metrics:delete', async (_, id) => {
      try {
        return database.deleteMetric(id);
      } catch (error) {
        console.error('Failed to delete metric:', error);
        throw error;
      }
    });

    // Agent IPC handlers
    ipcMain.handle('agent:startValuation', async (_, projectId) => {
      try {
        // Gather project data
        const project = database.getProject(projectId);
        const methods = database.getMethodsByProject(projectId);

        // Get all metrics for all methods
        const metrics = [];
        for (const method of methods) {
          const methodMetrics = database.getMetricsByMethod(method.id);
          metrics.push(...methodMetrics);
        }

        const projectData = {
          id: project.id,
          name: project.name,
          description: project.description,
          investment_type: project.investment_type,
          status: project.status,
          methods,
          metrics
        };

        // Start agent conversation with new SDK agent
        const response = await valuationAgent.startValuation(projectId, projectData);

        return {
          success: true,
          response
        };
      } catch (error) {
        console.error('Failed to start agent valuation:', error);
        return {
          success: false,
          error: error.message
        };
      }
    });

    ipcMain.handle('agent:sendMessage', async (_, projectId, message) => {
      try {
        const response = await valuationAgent.sendMessage(projectId, message);

        return {
          success: true,
          response
        };
      } catch (error) {
        console.error('Failed to send agent message:', error);
        return {
          success: false,
          error: error.message
        };
      }
    });

    ipcMain.handle('agent:clearConversation', async (_, projectId) => {
      try {
        valuationAgent.clearConversation(projectId);
        return { success: true };
      } catch (error) {
        console.error('Failed to clear conversation:', error);
        return { success: false, error: error.message };
      }
    });

    // Thread IPC handlers
    ipcMain.handle('threads:getByProject', async (_, projectId) => {
      try {
        return database.getThreadsByProject(projectId);
      } catch (error) {
        console.error('Failed to get threads:', error);
        throw error;
      }
    });

    ipcMain.handle('threads:getMessages', async (_, threadId) => {
      try {
        return database.getMessagesByThread(threadId);
      } catch (error) {
        console.error('Failed to get thread messages:', error);
        throw error;
      }
    });

    ipcMain.handle('threads:archiveThread', async (_, threadId) => {
      try {
        return database.archiveThread(threadId);
      } catch (error) {
        console.error('Failed to archive thread:', error);
        throw error;
      }
    });

    ipcMain.handle('threads:deleteThread', async (_, threadId) => {
      try {
        return database.deleteThread(threadId);
      } catch (error) {
        console.error('Failed to delete thread:', error);
        throw error;
      }
    });

    // Valuation Orchestrator IPC handlers (LEGACY - keeping for backward compatibility)
    ipcMain.handle('valuation:execute', async (_, projectId) => {
      try {
        // Create a progress channel for this execution
        const progressChannel = `valuation:progress:${projectId}`;

        const result = await valuationOrchestrator.executeProjectValuation(
          projectId,
          (message) => {
            // Send progress updates to renderer
            if (this.mainWindow) {
              this.mainWindow.webContents.send(progressChannel, message);
            }
          }
        );

        return result;
      } catch (error) {
        console.error('Failed to execute valuation:', error);
        throw error;
      }
    });

    ipcMain.handle('valuation:suggestWeights', async (_, projectId) => {
      try {
        return await valuationOrchestrator.suggestWeights(projectId);
      } catch (error) {
        console.error('Failed to suggest weights:', error);
        throw error;
      }
    });

    ipcMain.handle('valuation:applyWeights', async (_, projectId, weights) => {
      try {
        await valuationOrchestrator.applyWeights(projectId, weights);
        return { success: true };
      } catch (error) {
        console.error('Failed to apply weights:', error);
        throw error;
      }
    });

    ipcMain.handle('valuation:explainResult', async (_, methodId) => {
      try {
        return await valuationOrchestrator.explainMethodResult(methodId);
      } catch (error) {
        console.error('Failed to explain result:', error);
        throw error;
      }
    });

    ipcMain.handle('valuation:healthCheck', async () => {
      try {
        return await valuationOrchestrator.healthCheck();
      } catch (error) {
        console.error('Health check failed:', error);
        throw error;
      }
    });

    // Project update handlers
    ipcMain.handle('projects:updateStatus', async (_, projectId, status) => {
      try {
        return database.updateProjectStatus(projectId, status);
      } catch (error) {
        console.error('Failed to update project status:', error);
        throw error;
      }
    });
  }

  async initialize() {
    await app.whenReady();

    try {
      // Validate required environment variables
      this.validateEnvironment();

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