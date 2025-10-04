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
          investment_type TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS methods (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          project_id INTEGER NOT NULL,
          method_type TEXT NOT NULL,
          weight REAL NOT NULL DEFAULT 0,
          calculated_value REAL,
          last_calculated DATETIME,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS metrics (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          method_id INTEGER NOT NULL,
          metric_key TEXT NOT NULL,
          metric_value TEXT NOT NULL,
          metric_type TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (method_id) REFERENCES methods(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS conversation_threads (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          project_id INTEGER NOT NULL,
          title TEXT,
          started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          last_message_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          status TEXT DEFAULT 'active',
          FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS conversation_messages (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          thread_id INTEGER NOT NULL,
          type TEXT NOT NULL,
          content TEXT NOT NULL,
          metadata TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          sequence_number INTEGER NOT NULL,
          FOREIGN KEY (thread_id) REFERENCES conversation_threads(id) ON DELETE CASCADE
        );

        CREATE INDEX IF NOT EXISTS idx_thread_project ON conversation_threads(project_id);
        CREATE INDEX IF NOT EXISTS idx_message_thread ON conversation_messages(thread_id);
        CREATE INDEX IF NOT EXISTS idx_message_sequence ON conversation_messages(thread_id, sequence_number);
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

  // Methods CRUD
  createMethod(projectId, methodType, weight = 0) {
    try {
      const stmt = this.db.prepare(`
        INSERT INTO methods (project_id, method_type, weight, created_at, updated_at)
        VALUES (?, ?, ?, datetime('now'), datetime('now'))
      `);
      const result = stmt.run(projectId, methodType, weight);
      return this.getMethod(result.lastInsertRowid);
    } catch (error) {
      console.error('Failed to create method:', error);
      throw error;
    }
  }

  getMethod(id) {
    try {
      const stmt = this.db.prepare('SELECT * FROM methods WHERE id = ?');
      return stmt.get(id);
    } catch (error) {
      console.error('Failed to get method:', error);
      throw error;
    }
  }

  getMethodsByProject(projectId) {
    try {
      const stmt = this.db.prepare('SELECT * FROM methods WHERE project_id = ? ORDER BY created_at ASC');
      return stmt.all(projectId);
    } catch (error) {
      console.error('Failed to get methods by project:', error);
      throw error;
    }
  }

  updateMethod(id, data) {
    try {
      const fields = [];
      const values = [];

      if (data.weight !== undefined) {
        fields.push('weight = ?');
        values.push(data.weight);
      }
      if (data.calculated_value !== undefined) {
        fields.push('calculated_value = ?');
        values.push(data.calculated_value);
        fields.push("last_calculated = datetime('now')");
      }

      fields.push("updated_at = datetime('now')");
      values.push(id);

      const stmt = this.db.prepare(`
        UPDATE methods
        SET ${fields.join(', ')}
        WHERE id = ?
      `);
      stmt.run(...values);
      return this.getMethod(id);
    } catch (error) {
      console.error('Failed to update method:', error);
      throw error;
    }
  }

  deleteMethod(id) {
    try {
      const stmt = this.db.prepare('DELETE FROM methods WHERE id = ?');
      const result = stmt.run(id);
      return result.changes > 0;
    } catch (error) {
      console.error('Failed to delete method:', error);
      throw error;
    }
  }

  // Metrics CRUD
  createMetric(methodId, key, value, type = 'string') {
    try {
      const stmt = this.db.prepare(`
        INSERT INTO metrics (method_id, metric_key, metric_value, metric_type, created_at, updated_at)
        VALUES (?, ?, ?, ?, datetime('now'), datetime('now'))
      `);
      const result = stmt.run(methodId, key, value, type);
      return this.getMetric(result.lastInsertRowid);
    } catch (error) {
      console.error('Failed to create metric:', error);
      throw error;
    }
  }

  getMetric(id) {
    try {
      const stmt = this.db.prepare('SELECT * FROM metrics WHERE id = ?');
      return stmt.get(id);
    } catch (error) {
      console.error('Failed to get metric:', error);
      throw error;
    }
  }

  getMetricsByMethod(methodId) {
    try {
      const stmt = this.db.prepare('SELECT * FROM metrics WHERE method_id = ? ORDER BY created_at ASC');
      return stmt.all(methodId);
    } catch (error) {
      console.error('Failed to get metrics by method:', error);
      throw error;
    }
  }

  updateMetric(id, value) {
    try {
      const stmt = this.db.prepare(`
        UPDATE metrics
        SET metric_value = ?, updated_at = datetime('now')
        WHERE id = ?
      `);
      stmt.run(value, id);
      return this.getMetric(id);
    } catch (error) {
      console.error('Failed to update metric:', error);
      throw error;
    }
  }

  deleteMetric(id) {
    try {
      const stmt = this.db.prepare('DELETE FROM metrics WHERE id = ?');
      const result = stmt.run(id);
      return result.changes > 0;
    } catch (error) {
      console.error('Failed to delete metric:', error);
      throw error;
    }
  }

  // Batch operations for metrics
  createMetrics(methodId, metricsData) {
    try {
      const stmt = this.db.prepare(`
        INSERT INTO metrics (method_id, metric_key, metric_value, metric_type, created_at, updated_at)
        VALUES (?, ?, ?, ?, datetime('now'), datetime('now'))
      `);

      const results = [];
      for (const { key, value, type } of metricsData) {
        const result = stmt.run(methodId, key, value, type || 'string');
        results.push(this.getMetric(result.lastInsertRowid));
      }
      return results;
    } catch (error) {
      console.error('Failed to create metrics:', error);
      throw error;
    }
  }

  // Conversation Thread CRUD
  createThread(projectId, title = null) {
    try {
      const stmt = this.db.prepare(`
        INSERT INTO conversation_threads (project_id, title, started_at, last_message_at, status)
        VALUES (?, ?, datetime('now'), datetime('now'), 'active')
      `);
      const result = stmt.run(projectId, title);
      return this.getThread(result.lastInsertRowid);
    } catch (error) {
      console.error('Failed to create thread:', error);
      throw error;
    }
  }

  getThread(id) {
    try {
      const stmt = this.db.prepare('SELECT * FROM conversation_threads WHERE id = ?');
      return stmt.get(id);
    } catch (error) {
      console.error('Failed to get thread:', error);
      throw error;
    }
  }

  getThreadsByProject(projectId) {
    try {
      const stmt = this.db.prepare(`
        SELECT * FROM conversation_threads
        WHERE project_id = ?
        ORDER BY last_message_at DESC
      `);
      return stmt.all(projectId);
    } catch (error) {
      console.error('Failed to get threads by project:', error);
      throw error;
    }
  }

  getActiveThreadByProject(projectId) {
    try {
      const stmt = this.db.prepare(`
        SELECT * FROM conversation_threads
        WHERE project_id = ? AND status = 'active'
        ORDER BY last_message_at DESC
        LIMIT 1
      `);
      return stmt.get(projectId);
    } catch (error) {
      console.error('Failed to get active thread:', error);
      throw error;
    }
  }

  updateThreadTitle(id, title) {
    try {
      const stmt = this.db.prepare(`
        UPDATE conversation_threads
        SET title = ?, updated_at = datetime('now')
        WHERE id = ?
      `);
      stmt.run(title, id);
      return this.getThread(id);
    } catch (error) {
      console.error('Failed to update thread title:', error);
      throw error;
    }
  }

  updateThreadLastMessage(id) {
    try {
      const stmt = this.db.prepare(`
        UPDATE conversation_threads
        SET last_message_at = datetime('now')
        WHERE id = ?
      `);
      stmt.run(id);
    } catch (error) {
      console.error('Failed to update thread last message:', error);
      throw error;
    }
  }

  archiveThread(id) {
    try {
      const stmt = this.db.prepare(`
        UPDATE conversation_threads
        SET status = 'archived'
        WHERE id = ?
      `);
      stmt.run(id);
      return this.getThread(id);
    } catch (error) {
      console.error('Failed to archive thread:', error);
      throw error;
    }
  }

  // Conversation Message CRUD
  createMessage(threadId, type, content, metadata = null) {
    try {
      // Get next sequence number
      const seqStmt = this.db.prepare(`
        SELECT COALESCE(MAX(sequence_number), 0) + 1 as next_seq
        FROM conversation_messages
        WHERE thread_id = ?
      `);
      const { next_seq } = seqStmt.get(threadId);

      // Serialize metadata to JSON if it's an object
      const metadataStr = metadata ? JSON.stringify(metadata) : null;

      const stmt = this.db.prepare(`
        INSERT INTO conversation_messages (thread_id, type, content, metadata, created_at, sequence_number)
        VALUES (?, ?, ?, ?, datetime('now', 'subsec'), ?)
      `);
      const result = stmt.run(threadId, type, content, metadataStr, next_seq);

      // Update thread's last_message_at
      this.updateThreadLastMessage(threadId);

      return this.getMessage(result.lastInsertRowid);
    } catch (error) {
      console.error('Failed to create message:', error);
      throw error;
    }
  }

  getMessage(id) {
    try {
      const stmt = this.db.prepare('SELECT * FROM conversation_messages WHERE id = ?');
      const message = stmt.get(id);
      if (message && message.metadata) {
        message.metadata = JSON.parse(message.metadata);
      }
      return message;
    } catch (error) {
      console.error('Failed to get message:', error);
      throw error;
    }
  }

  getMessagesByThread(threadId) {
    try {
      const stmt = this.db.prepare(`
        SELECT * FROM conversation_messages
        WHERE thread_id = ?
        ORDER BY sequence_number ASC
      `);
      const messages = stmt.all(threadId);
      // Parse metadata JSON for each message
      return messages.map(msg => ({
        ...msg,
        metadata: msg.metadata ? JSON.parse(msg.metadata) : null
      }));
    } catch (error) {
      console.error('Failed to get messages by thread:', error);
      throw error;
    }
  }

  deleteThread(id) {
    try {
      const stmt = this.db.prepare('DELETE FROM conversation_threads WHERE id = ?');
      const result = stmt.run(id);
      return result.changes > 0;
    } catch (error) {
      console.error('Failed to delete thread:', error);
      throw error;
    }
  }
}

module.exports = new DatabaseManager();