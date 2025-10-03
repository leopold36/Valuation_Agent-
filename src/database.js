const Database = require('better-sqlite3');
const path = require('path');
const { app } = require('electron');

class DatabaseManager {
  constructor() {
    this.db = null;
  }

  init() {
    try {
      const dbPath = path.join(app.getPath('userData'), 'app.db');
      this.db = new Database(dbPath);

      this.db.exec(`
        CREATE TABLE IF NOT EXISTS projects (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          description TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      console.log('Database initialized successfully');
    } catch (error) {
      console.error('Failed to initialize database:', error);
      throw error;
    }
  }

  createProject(name, description = '') {
    try {
      const stmt = this.db.prepare(`
        INSERT INTO projects (name, description, created_at, updated_at)
        VALUES (?, ?, datetime('now'), datetime('now'))
      `);
      const result = stmt.run(name, description);
      return this.getProject(result.lastInsertRowid);
    } catch (error) {
      console.error('Failed to create project:', error);
      throw error;
    }
  }

  getProjects() {
    try {
      const stmt = this.db.prepare('SELECT * FROM projects ORDER BY created_at DESC');
      return stmt.all();
    } catch (error) {
      console.error('Failed to get projects:', error);
      throw error;
    }
  }

  getProject(id) {
    try {
      const stmt = this.db.prepare('SELECT * FROM projects WHERE id = ?');
      return stmt.get(id);
    } catch (error) {
      console.error('Failed to get project:', error);
      throw error;
    }
  }

  deleteProject(id) {
    try {
      const stmt = this.db.prepare('DELETE FROM projects WHERE id = ?');
      const result = stmt.run(id);
      return result.changes > 0;
    } catch (error) {
      console.error('Failed to delete project:', error);
      throw error;
    }
  }

  close() {
    if (this.db) {
      this.db.close();
    }
  }

  // Database viewer methods
  getTables() {
    try {
      const stmt = this.db.prepare(`
        SELECT name FROM sqlite_master
        WHERE type='table'
        AND name NOT LIKE 'sqlite_%'
        ORDER BY name
      `);
      return stmt.all();
    } catch (error) {
      console.error('Failed to get tables:', error);
      throw error;
    }
  }

  getTableSchema(tableName) {
    try {
      const stmt = this.db.prepare(`PRAGMA table_info(${tableName})`);
      return stmt.all();
    } catch (error) {
      console.error('Failed to get table schema:', error);
      throw error;
    }
  }

  getTableData(tableName) {
    try {
      const stmt = this.db.prepare(`SELECT * FROM ${tableName}`);
      return stmt.all();
    } catch (error) {
      console.error('Failed to get table data:', error);
      throw error;
    }
  }
}

module.exports = new DatabaseManager();