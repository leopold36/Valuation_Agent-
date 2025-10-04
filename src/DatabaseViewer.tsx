import React, { useState, useEffect, useCallback, useRef } from 'react';
import { TableInfo, ColumnInfo } from './types';

interface DatabaseViewerProps {
  isOpen: boolean;
  onClose: () => void;
}

interface TableData {
  [tableName: string]: {
    schema: ColumnInfo[];
    data: any[];
    dataOpen: boolean;
  };
}

const DatabaseViewer: React.FC<DatabaseViewerProps> = ({ isOpen, onClose }) => {
  const [tableData, setTableData] = useState<TableData>({});
  const openStateRef = useRef<{ [key: string]: boolean }>({});
  const VALID_TABLES = ['projects', 'methods', 'metrics'];

  const loadAllTables = useCallback(async () => {
    try {
      const newTableData: TableData = {};

      for (const tableName of VALID_TABLES) {
        const [schema, data] = await Promise.all([
          window.electronAPI.db.getTableSchema(tableName),
          window.electronAPI.db.getTableData(tableName),
        ]);

        newTableData[tableName] = {
          schema,
          data,
          dataOpen: openStateRef.current[tableName] ?? false,
        };
      }

      setTableData(newTableData);
    } catch (error) {
      console.error('Failed to load tables:', error);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      loadAllTables();
      const interval = setInterval(loadAllTables, 2000);
      return () => clearInterval(interval);
    }
  }, [isOpen, loadAllTables]);

  const toggleData = (tableName: string) => {
    openStateRef.current[tableName] = !openStateRef.current[tableName];
    setTableData(prev => ({
      ...prev,
      [tableName]: {
        ...prev[tableName],
        dataOpen: openStateRef.current[tableName],
      },
    }));
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="flex-1 bg-gray-900 text-gray-100 overflow-auto">
      <div className="p-4 space-y-4">
        {VALID_TABLES.map(tableName => {
          const table = tableData[tableName];
          if (!table) return null;

          return (
            <div key={tableName} className="bg-gray-800 rounded-lg overflow-hidden">
              <div className="px-4 py-2 bg-gray-700 border-b border-gray-600">
                <h2 className="text-sm font-semibold text-gray-200">{tableName}</h2>
              </div>

              {/* Data Bar */}
              <div>
                <button
                  onClick={() => toggleData(tableName)}
                  className="w-full px-4 py-2 flex items-center justify-between hover:bg-gray-750 transition-colors"
                >
                  <span className="text-xs font-medium text-gray-300">
                    Data ({table.data.length} rows)
                  </span>
                  <span className="text-gray-500">
                    {table.dataOpen ? '▼' : '▶'}
                  </span>
                </button>
                {table.dataOpen && (
                  <div className="px-4 py-3 bg-gray-800">
                    {table.data.length === 0 ? (
                      <div className="text-xs text-gray-500 italic">No data</div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="border-b border-gray-700">
                              {table.schema.map((col) => (
                                <th key={col.cid} className="text-left py-2 pr-4 text-gray-400 font-medium">
                                  {col.name}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {table.data.map((row, idx) => (
                              <tr key={idx} className="border-b border-gray-700 hover:bg-gray-750">
                                {table.schema.map((col) => (
                                  <td key={col.cid} className="py-2 pr-4 text-gray-300">
                                    {row[col.name] === null ? (
                                      <span className="text-gray-500 italic">null</span>
                                    ) : (
                                      <span className="truncate block max-w-xs">
                                        {String(row[col.name])}
                                      </span>
                                    )}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default DatabaseViewer;
