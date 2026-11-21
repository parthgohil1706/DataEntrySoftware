import React, { useState } from 'react';
import { Search, Trash2, Edit3, Check, X, FileSpreadsheet, ArrowRightLeft } from 'lucide-react';
import { isEmailColumn, isValidEmail } from '../utils/validation';

export default function DataTable({ columns, records, onDeleteRecord, onUpdateRecord }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editRowData, setEditRowData] = useState({});
  const [editError, setEditError] = useState('');

  const filteredRecords = records.filter(record => {
    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase();
    return columns.some(col => {
      const val = record[col.id];
      return val && String(val).toLowerCase().includes(q);
    });
  });

  const startEdit = (record) => {
    setEditingId(record._id);
    setEditRowData({ ...record });
    setEditError('');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditRowData({});
    setEditError('');
  };

  const saveEdit = () => {
    // Validate email if editing email column
    for (let col of columns) {
      if (isEmailColumn(col)) {
        const val = (editRowData[col.id] || '').trim();
        if (val && !isValidEmail(val)) {
          setEditError(`"${col.name}" must be a valid email (e.g. user@example.com).`);
          return;
        }
      }
    }

    onUpdateRecord(editingId, editRowData);
    setEditingId(null);
    setEditRowData({});
    setEditError('');
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden">
      {/* Table Header Controls */}
      <div className="p-3 sm:p-4 border-b border-slate-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 sm:gap-3">
        <div className="flex items-center justify-between sm:justify-start gap-2">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-emerald-600 shrink-0" />
            <h3 className="font-bold text-slate-800 text-xs sm:text-sm">
              Saved Records
            </h3>
            <span className="text-[11px] sm:text-xs bg-slate-100 text-slate-600 font-bold px-2 py-0.5 rounded-full">
              {records.length}
            </span>
          </div>

          {/* Mobile swipe hint */}
          {columns.length > 2 && (
            <span className="sm:hidden text-[10px] text-slate-400 font-medium flex items-center gap-1">
              <ArrowRightLeft className="w-3 h-3" /> Scroll
            </span>
          )}
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search records..."
            className="w-full pl-8 pr-3 py-1.5 text-base sm:text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white transition"
          />
        </div>
      </div>

      {editError && (
        <div className="px-4 py-2 bg-rose-50 border-b border-rose-100 text-rose-600 text-xs font-medium">
          {editError}
        </div>
      )}

      {/* Table Content */}
      {filteredRecords.length === 0 ? (
        <div className="p-8 sm:p-10 text-center text-slate-400">
          <p className="text-xs sm:text-sm">No records found.</p>
          <p className="text-[11px] sm:text-xs mt-1">Use the entry form above to add your first row.</p>
        </div>
      ) : (
        <div className="overflow-x-auto touch-pan-x">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                <th className="py-2.5 px-2.5 sm:px-3 w-10 text-center text-slate-400 font-normal">#</th>
                {columns.map(col => (
                  <th key={col.id} className="py-2.5 px-3 min-w-[110px] sm:min-w-[130px]">
                    {col.name}
                  </th>
                ))}
                <th className="py-2.5 px-2.5 sm:px-3 w-20 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRecords.map((record, index) => {
                const isEditing = editingId === record._id;

                return (
                  <tr key={record._id} className="hover:bg-blue-50/40 transition">
                    <td className="py-2 px-2.5 sm:px-3 text-center text-slate-400 font-mono text-[11px]">
                      {index + 1}
                    </td>

                    {columns.map(col => {
                      if (isEditing) {
                        return (
                          <td key={col.id} className="py-1 px-2">
                            <input
                              type={
                                isEmailColumn(col)
                                  ? 'email'
                                  : col.type === 'number'
                                    ? 'number'
                                    : col.type === 'date'
                                      ? 'date'
                                      : 'text'
                              }
                              value={editRowData[col.id] ?? ''}
                              onChange={(e) =>
                                setEditRowData({
                                  ...editRowData,
                                  [col.id]: e.target.value
                                })
                              }
                              className="w-full px-2 py-1 text-xs bg-white border border-blue-300 rounded focus:outline-none"
                            />
                          </td>
                        );
                      }

                      let displayVal = record[col.id];
                      if (col.type === 'boolean') {
                        displayVal = displayVal ? (
                          <span className="text-emerald-600 font-bold">YES</span>
                        ) : (
                          <span className="text-slate-400">NO</span>
                        );
                      } else if (!displayVal && displayVal !== 0) {
                        displayVal = <span className="text-slate-300 italic">—</span>;
                      }

                      return (
                        <td key={col.id} className="py-2.5 px-3 text-slate-700 max-w-[200px] sm:max-w-[260px] truncate">
                          {displayVal}
                        </td>
                      );
                    })}

                    <td className="py-2 px-2.5 sm:px-3 text-center">
                      {isEditing ? (
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={saveEdit}
                            className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded"
                            title="Save"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={cancelEdit}
                            className="p-1.5 text-slate-400 hover:bg-slate-100 rounded"
                            title="Cancel"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center gap-0.5 sm:gap-1">
                          <button
                            onClick={() => startEdit(record)}
                            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition"
                            title="Edit"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm('Delete this record?')) {
                                onDeleteRecord(record._id);
                              }
                            }}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
