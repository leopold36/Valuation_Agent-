export interface Project {
  id: number;
  name: string;
  description: string;
  created_at: string;
  updated_at: string;
}

export interface TableInfo {
  name: string;
}

export interface ColumnInfo {
  cid: number;
  name: string;
  type: string;
  notnull: number;
  dflt_value: any;
  pk: number;
}

export interface ElectronAPI {
  projects: {
    getAll: () => Promise<Project[]>;
    create: (name: string, description?: string) => Promise<Project>;
    get: (id: number) => Promise<Project>;
    delete: (id: number) => Promise<boolean>;
  };
  db: {
    getTables: () => Promise<TableInfo[]>;
    getTableSchema: (tableName: string) => Promise<ColumnInfo[]>;
    getTableData: (tableName: string) => Promise<any[]>;
  };
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}