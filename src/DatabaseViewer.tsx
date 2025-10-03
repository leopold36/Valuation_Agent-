import React, { useState, useEffect } from 'react';
import { TableInfo, ColumnInfo } from './types';

interface DatabaseViewerProps {
  isOpen: boolean;
  onClose: () => void;
}

const DatabaseViewer: React.FC<DatabaseViewerProps> = ({ isOpen, onClose }) => {
  const [tables, setTables] = useState<TableInfo[]>([]);
  const [selectedTable, setSelectedTable] = useState<string>('');
  const [schema, setSchema] = useState<ColumnInfo[]>([]);
  const [data, setData] = useState<any[]>([]);

  useEffect(() => {
    loadTables();
    const interval = setInterval(refreshData, 2000); // Refresh every 2 seconds
    return () => clearInterval(interval);
  }, [selectedTable]);

  const loadTables = async () => {
    try {
      const tableList = await window.electronAPI.db.getTables();
      setTables(tableList);
      if (tableList.length > 0 && !selectedTable) {
        setSelectedTable(tableList[0].name);
      }
    } catch (error) {
      console.error('Failed to load tables:', error);
    }
  };

  const refreshData = async () => {
    if (!selectedTable) return;

    try {
      const [schemaData, tableData] = await Promise.all([
        window.electronAPI.db.getTableSchema(selectedTable),
        window.electronAPI.db.getTableData(selectedTable),
      ]);
      setSchema(schemaData);
      setData(tableData);
    } catch (error) {
      console.error('Failed to refresh data:', error);
    }
  };

  const handleTableChange = (tableName: string) => {
    setSelectedTable(tableName);
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100">
      <div className="px-4 py-3 bg-gray-800 border-b border-gray-700">
        <h2 className="text-sm font-semibold">Database Viewer</h2>
      </div>

      <div className="p-4">
        <div className="mb-4">
          <label className="text-xs text-gray-400 mb-1 block">Select Table</label>
          <select
            value={selectedTable}
            onChange={(e) => handleTableChange(e.target.value)}
            className="px-3 py-2 text-sm bg-gray-800 border border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {tables.map((table) => (
              <option key={table.name} value={table.name}>
                {table.name}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* Schema Section */}
          {schema.length > 0 && (
            <div className="bg-gray-800 rounded-lg p-4">
              <h3 className="text-sm font-semibold mb-3 text-gray-300">Schema</h3>
              <div className="space-y-2">
                {schema.map((col) => (
                  <div key={col.cid} className="flex items-center justify-between text-sm border-b border-gray-700 pb-2">
                    <span className="font-mono text-blue-400">{col.name}</span>
                    <span className="text-gray-500 text-xs">{col.type}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Data Section */}
          <div className="bg-gray-800 rounded-lg p-4">
            <h3 className="text-sm font-semibold mb-3 text-gray-300">
              Data ({data.length} rows)
            </h3>
            <div className="max-h-96 overflow-auto">
              {data.length === 0 ? (
                <div className="text-sm text-gray-500 italic">No data</div>
              ) : (
                <div className="space-y-3">
                  {data.map((row, idx) => (
                    <div key={idx} className="bg-gray-700 rounded p-3 text-sm">
                      {Object.entries(row).map(([key, value]) => (
                        <div key={key} className="flex justify-between py-1 border-b border-gray-600 last:border-0">
                          <span className="font-mono text-gray-400">{key}:</span>
                          <span className="text-gray-200 ml-2 truncate max-w-sm">
                            {value === null ? (
                              <span className="text-gray-500 italic">null</span>
                            ) : (
                              String(value)
                            )}
                          </span>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DatabaseViewer;
