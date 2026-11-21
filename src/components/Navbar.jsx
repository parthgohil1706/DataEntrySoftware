import React from 'react';
import { Database, LogOut, Mail, Download, Plus, Settings } from 'lucide-react';

export default function Navbar({
  user,
  onLogout,
  currentSheet,
  sheets,
  onSelectSheet,
  onNewSheet,
  onEditColumns,
  onExport,
  recordCount
}) {
  return (
    <header className="sticky top-0 z-30 bg-white border-b border-slate-200 shadow-sm">
      <div className="max-w-6xl mx-auto px-3 sm:px-4 h-14 sm:h-16 flex items-center justify-between gap-1.5 sm:gap-2">
        {/* Logo & Sheet Selector */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white font-bold shrink-0 shadow-sm">
            <Database className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div className="min-w-0">
            <h1 className="font-semibold text-slate-900 text-xs sm:text-base leading-tight truncate">
              QuickEntry
            </h1>
            {user && (
              <div className="flex items-center gap-1 mt-0.5">
                <select
                  value={currentSheet?.id || ''}
                  onChange={(e) => {
                    const found = sheets.find(s => s.id === e.target.value);
                    if (found) onSelectSheet(found);
                  }}
                  className="text-[11px] sm:text-xs font-medium text-slate-600 bg-slate-100 rounded px-1.5 py-0.5 border border-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 max-w-[100px] xs:max-w-[130px] sm:max-w-[180px] md:max-w-[220px] truncate"
                >
                  {sheets.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
                <button
                  onClick={onNewSheet}
                  title="New Sheet"
                  className="p-1 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded transition shrink-0"
                >
                  <Plus className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {currentSheet && (
            <>
              <button
                onClick={onEditColumns}
                className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
                title="Edit Columns"
              >
                <Settings className="w-3.5 h-3.5 text-slate-500" />
                <span>Columns ({currentSheet.columns.length})</span>
              </button>

              <button
                onClick={onExport}
                className="inline-flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 rounded-lg shadow-sm transition"
                title="Download Excel Sheet"
              >
                <Download className="w-3.5 h-3.5 shrink-0" />
                <span className="hidden xs:inline">Export</span>
                <span className="bg-emerald-700/60 text-white text-[10px] px-1.5 py-0.2 rounded font-bold">
                  {recordCount}
                </span>
              </button>
            </>
          )}

          {/* User profile / Logout */}
          {user && (
            <div className="flex items-center pl-1 sm:pl-2 border-l border-slate-200 gap-1 sm:gap-2">
              <span
                className="hidden lg:inline-flex items-center gap-1.5 text-xs text-slate-600 font-medium bg-slate-50 px-2.5 py-1 rounded-md border border-slate-200 max-w-[180px] truncate"
                title={user.email}
              >
                <Mail className="w-3 h-3 text-slate-400 shrink-0" />
                <span className="truncate">{user.email}</span>
              </span>
              <button
                onClick={onLogout}
                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                title="Sign Out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
