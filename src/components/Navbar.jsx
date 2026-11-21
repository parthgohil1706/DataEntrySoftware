import React from 'react';
import { Database, Cloud, LogOut, Mail, Download, Plus, Settings, User } from 'lucide-react';

export default function Navbar({
  user,
  onLogout,
  onOpenProfile,
  currentSheet,
  sheets,
  onSelectSheet,
  onNewSheet,
  onEditColumns,
  onExport,
  recordCount,
  onOpenCloudSettings,
  dbConnected,
  dbLabel
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
          {/* Cloud Database Status */}
          <button
            onClick={onOpenCloudSettings}
            title={dbConnected ? `Connected: ${dbLabel || 'Supabase Cloud Database'}` : "Click to view Cloud Database settings"}
            className={`hidden sm:inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-lg border transition ${
              dbConnected
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                : 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100'
            }`}
          >
            <Cloud className="w-3.5 h-3.5" />
            <span className="hidden md:inline">{dbLabel || (dbConnected ? 'Cloud Database' : 'Connect Cloud DB')}</span>
          </button>

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
              <button
                type="button"
                onClick={onOpenProfile}
                className="flex items-center gap-1.5 text-xs text-slate-700 font-medium bg-slate-100 hover:bg-slate-200 px-2 sm:px-2.5 py-1.5 rounded-lg border border-slate-200 transition"
                title="Account Profile & Change Password"
              >
                <div className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px] font-bold shrink-0">
                  {(user.email?.[0] || 'U').toUpperCase()}
                </div>
                <span className="hidden xl:inline truncate max-w-[140px] text-slate-600">{user.email}</span>
                <span className="hidden sm:inline xl:hidden text-slate-700">Profile</span>
              </button>

              <button
                onClick={onLogout}
                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                title="Sign Out"
                aria-label="Sign Out"
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
