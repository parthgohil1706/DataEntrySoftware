import React, { useState } from 'react';
import { Plus, Trash2, X, Check, AlertCircle } from 'lucide-react';

const FIELD_TYPES = [
  { value: 'text', label: 'Short Text' },
  { value: 'email', label: 'Email Address (@)' },
  { value: 'number', label: 'Number' },
  { value: 'date', label: 'Date' },
  { value: 'select', label: 'Dropdown / Select' },
  { value: 'textarea', label: 'Long Notes' },
  { value: 'boolean', label: 'Yes / No Checkbox' }
];

export default function ColumnSetup({ initialSheet, onSave, onCancel }) {
  const [sheetName, setSheetName] = useState(initialSheet ? initialSheet.name : 'New Sheet');
  const [columns, setColumns] = useState(
    initialSheet && initialSheet.columns?.length > 0
      ? initialSheet.columns
      : [
          { id: 'col_1', name: 'Name', type: 'text', required: true, options: '' },
          { id: 'col_2', name: 'Email', type: 'email', required: true, options: '' },
          { id: 'col_3', name: 'Amount', type: 'number', required: false, options: '' },
          { id: 'col_4', name: 'Date', type: 'date', required: false, options: '' }
        ]
  );
  const [error, setError] = useState('');

  const addColumn = () => {
    const newId = 'col_' + Date.now();
    setColumns([
      ...columns,
      { id: newId, name: `Column ${columns.length + 1}`, type: 'text', required: false, options: '' }
    ]);
  };

  const removeColumn = (id) => {
    if (columns.length <= 1) {
      setError('You must have at least one column.');
      return;
    }
    setColumns(columns.filter(c => c.id !== id));
  };

  const updateColumn = (id, field, value) => {
    setError('');
    setColumns(columns.map(c => {
      if (c.id !== id) return c;
      const updated = { ...c, [field]: value };
      if (field === 'name' && value.trim().toLowerCase().includes('email') && c.type === 'text') {
        updated.type = 'email';
      }
      return updated;
    }));
  };

  const handleSave = (e) => {
    e.preventDefault();
    if (!sheetName.trim()) {
      setError('Please provide a sheet name.');
      return;
    }
    if (columns.length === 0) {
      setError('Please add at least one column.');
      return;
    }
    for (let col of columns) {
      if (!col.name.trim()) {
        setError('All columns must have a valid name.');
        return;
      }
    }

    onSave({
      id: initialSheet ? initialSheet.id : 'sheet_' + Date.now(),
      name: sheetName.trim(),
      columns: columns.map(c => ({
        ...c,
        name: c.name.trim(),
        options: c.type === 'select' ? c.options : ''
      })),
      updatedAt: new Date().toISOString()
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-2.5 sm:p-4 md:p-6 overflow-y-auto">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-100 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-4 sm:px-5 py-3.5 sm:py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-800">
              {initialSheet ? 'Configure Columns' : 'Setup New Sheet'}
            </h2>
            <p className="text-[11px] sm:text-xs text-slate-500">
              Define Excel columns, data types, and required fields.
            </p>
          </div>
          <button
            onClick={onCancel}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-3.5 sm:p-5 overflow-y-auto space-y-4 flex-1">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-600 rounded-xl text-xs font-medium flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-[11px] sm:text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Sheet Name
            </label>
            <input
              type="text"
              value={sheetName}
              onChange={(e) => setSheetName(e.target.value)}
              placeholder="e.g. Daily Sales 2026, Customer Data"
              className="w-full px-3.5 py-2 text-base sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-[11px] sm:text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Columns ({columns.length})
              </label>
              <button
                type="button"
                onClick={addColumn}
                className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-2.5 py-1.5 rounded-lg transition"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Column</span>
              </button>
            </div>

            <div className="space-y-2.5 sm:space-y-3">
              {columns.map((col, index) => (
                <div
                  key={col.id}
                  className="p-3 bg-slate-50/90 rounded-xl border border-slate-200/80 space-y-2.5 hover:border-slate-300 transition"
                >
                  {/* Responsive Row: Mobile stacks gracefully, Desktop is clean single-line */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                    <div className="flex items-center gap-2 flex-1">
                      <span className="w-6 h-6 rounded-md bg-slate-200 text-slate-700 text-xs font-bold flex items-center justify-center shrink-0">
                        {index + 1}
                      </span>
                      <input
                        type="text"
                        value={col.name}
                        onChange={(e) => updateColumn(col.id, 'name', e.target.value)}
                        placeholder="Column Header Name"
                        className="flex-1 px-3 py-1.5 text-base sm:text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <button
                        type="button"
                        onClick={() => removeColumn(col.id)}
                        className="sm:hidden p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition shrink-0"
                        title="Remove Column"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="flex items-center gap-2 pl-8 sm:pl-0">
                      <select
                        value={col.type}
                        onChange={(e) => updateColumn(col.id, 'type', e.target.value)}
                        className="w-full sm:w-auto px-2.5 py-1.5 text-base sm:text-xs md:text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-slate-700"
                      >
                        {FIELD_TYPES.map(ft => (
                          <option key={ft.value} value={ft.value}>{ft.label}</option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => removeColumn(col.id)}
                        className="hidden sm:inline-flex p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition shrink-0"
                        title="Remove Column"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Dropdown Options Config */}
                  {col.type === 'select' && (
                    <div className="pl-8 pr-1">
                      <input
                        type="text"
                        value={col.options || ''}
                        onChange={(e) => updateColumn(col.id, 'options', e.target.value)}
                        placeholder="Options separated by commas: e.g. High, Medium, Low"
                        className="w-full px-3 py-1.5 text-xs bg-white border border-blue-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-600"
                      />
                    </div>
                  )}

                  {/* Info helper for Email */}
                  {col.type === 'email' && (
                    <div className="pl-8 text-[11px] text-blue-600 font-medium">
                      ✓ Strict email format check enabled
                    </div>
                  )}

                  {/* Checkbox: Required */}
                  <div className="pl-8 flex items-center gap-2">
                    <label className="inline-flex items-center gap-1.5 text-[11px] font-medium text-slate-500 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={col.required}
                        onChange={(e) => updateColumn(col.id, 'required', e.target.checked)}
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 h-4 w-4"
                      />
                      <span>Required field</span>
                    </label>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-4 sm:px-5 py-3 border-t border-slate-100 flex items-center justify-end gap-2 bg-slate-50 rounded-b-2xl">
          <button
            type="button"
            onClick={onCancel}
            className="px-3.5 sm:px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-200 rounded-xl transition"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-4 sm:px-5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded-xl shadow-sm inline-flex items-center gap-1.5 transition"
          >
            <Check className="w-4 h-4" />
            <span>Save Columns</span>
          </button>
        </div>
      </div>
    </div>
  );
}
