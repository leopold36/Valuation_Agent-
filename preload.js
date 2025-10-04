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
  },
  methods: {
    create: (projectId, methodType, weight) =>
      ipcRenderer.invoke('methods:create', projectId, methodType, weight),
    getByProject: (projectId) => ipcRenderer.invoke('methods:getByProject', projectId),
    update: (id, data) => ipcRenderer.invoke('methods:update', id, data),
    delete: (id) => ipcRenderer.invoke('methods:delete', id),
  },
  metrics: {
    create: (methodId, key, value, type) =>
      ipcRenderer.invoke('metrics:create', methodId, key, value, type),
    createBatch: (methodId, metricsData) =>
      ipcRenderer.invoke('metrics:createBatch', methodId, metricsData),
    getByMethod: (methodId) => ipcRenderer.invoke('metrics:getByMethod', methodId),
    update: (id, value) => ipcRenderer.invoke('metrics:update', id, value),
    delete: (id) => ipcRenderer.invoke('metrics:delete', id),
  },
  valuation: {
    execute: (projectId) => ipcRenderer.invoke('valuation:execute', projectId),
    suggestWeights: (projectId) => ipcRenderer.invoke('valuation:suggestWeights', projectId),
    applyWeights: (projectId, weights) => ipcRenderer.invoke('valuation:applyWeights', projectId, weights),
    explainResult: (methodId) => ipcRenderer.invoke('valuation:explainResult', methodId),
    healthCheck: () => ipcRenderer.invoke('valuation:healthCheck'),
    onProgress: (projectId, callback) => {
      const channel = `valuation:progress:${projectId}`;
      const subscription = (_, message) => callback(message);
      ipcRenderer.on(channel, subscription);

      // Return cleanup function
      return () => {
        ipcRenderer.removeListener(channel, subscription);
      };
    },
  },
  agent: {
    startValuation: (projectId) => ipcRenderer.invoke('agent:startValuation', projectId),
    sendMessage: (projectId, message) => ipcRenderer.invoke('agent:sendMessage', projectId, message),
    clearConversation: (projectId) => ipcRenderer.invoke('agent:clearConversation', projectId),
  },
  threads: {
    getByProject: (projectId) => ipcRenderer.invoke('threads:getByProject', projectId),
    getActiveThread: (projectId) => ipcRenderer.invoke('threads:getActiveThread', projectId),
    getMessages: (threadId) => ipcRenderer.invoke('threads:getMessages', threadId),
    archiveThread: (threadId) => ipcRenderer.invoke('threads:archiveThread', threadId),
    deleteThread: (threadId) => ipcRenderer.invoke('threads:deleteThread', threadId),
  }
});