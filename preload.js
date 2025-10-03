const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  projects: {
    getAll: () => ipcRenderer.invoke('projects:getAll'),
    create: (name, description) => ipcRenderer.invoke('projects:create', name, description),
    get: (id) => ipcRenderer.invoke('projects:get', id),
    delete: (id) => ipcRenderer.invoke('projects:delete', id),
  },
  db: {
    getTables: () => ipcRenderer.invoke('db:getTables'),
    getTableSchema: (tableName) => ipcRenderer.invoke('db:getTableSchema', tableName),
    getTableData: (tableName) => ipcRenderer.invoke('db:getTableData', tableName),
  }
});