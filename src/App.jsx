import React, { useState, useEffect } from 'react';
import { Storage } from './utils/storage';
import { exportToExcel } from './utils/excel';
import { isSupabaseConfigured } from './utils/supabase';
import Navbar from './components/Navbar';
import AuthModal from './components/AuthModal';
import ColumnSetup from './components/ColumnSetup';
import DataEntryForm from './components/DataEntryForm';
import DataTable from './components/DataTable';
import PWAInstallPrompt from './components/PWAInstallPrompt';
import { LayoutGrid, Plus, Sliders, Cloud, CheckCircle2 } from 'lucide-react';

export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [sheets, setSheets] = useState([]);
  const [activeSheet, setActiveSheet] = useState(null);
  const [records, setRecords] = useState([]);
  const [showColumnSetup, setShowColumnSetup] = useState(false);
  const [isEditingColumns, setIsEditingColumns] = useState(false);
  const [showCloudModal, setShowCloudModal] = useState(false);
  const [supabaseUrl, setSupabaseUrl] = useState(localStorage.getItem('qe_supabase_url') || '');
  const [supabaseAnonKey, setSupabaseAnonKey] = useState(localStorage.getItem('qe_supabase_anon_key') || '');
  const [cloudSaved, setCloudSaved] = useState(false);

  // 1. Initial Load of Auth
  useEffect(() => {
    const user = Storage.getCurrentUser();
    if (user) {
      setCurrentUser(user);
    }
  }, []);

  // 2. Load Sheets for User (Async Cloud + Local)
  useEffect(() => {
    let isMounted = true;
    if (currentUser) {
      Storage.getSheets(currentUser.id).then(userSheets => {
        if (!isMounted) return;
        setSheets(userSheets || []);
        if (userSheets && userSheets.length > 0) {
          setActiveSheet(userSheets[0]);
        } else {
          setActiveSheet(null);
        }
      });
    } else {
      setSheets([]);
      setActiveSheet(null);
      setRecords([]);
    }
    return () => { isMounted = false; };
  }, [currentUser]);

  // 3. Load Records for Active Sheet (Async Cloud + Local)
  useEffect(() => {
    let isMounted = true;
    if (currentUser && activeSheet) {
      Storage.getRecords(currentUser.id, activeSheet.id).then(sheetRecords => {
        if (!isMounted) return;
        setRecords(sheetRecords || []);
      });
    } else {
      setRecords([]);
    }
    return () => { isMounted = false; };
  }, [currentUser, activeSheet]);

  // Handlers
  const handleAuthSuccess = (user) => {
    setCurrentUser(user);
  };

  const handleLogout = () => {
    Storage.logout();
    setCurrentUser(null);
  };

  const handleSaveSheet = async (sheetConfig) => {
    let updated;
    const exists = sheets.find(s => s.id === sheetConfig.id);
    if (exists) {
      updated = sheets.map(s => s.id === sheetConfig.id ? sheetConfig : s);
    } else {
      updated = [...sheets, sheetConfig];
    }
    setSheets(updated);
    await Storage.saveSheets(currentUser.id, updated);
    setActiveSheet(sheetConfig);
    setShowColumnSetup(false);
    setIsEditingColumns(false);
  };

  const handleAddRecord = async (recordData) => {
    if (!currentUser || !activeSheet) return;
    const newRecord = {
      _id: 'row_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
      createdAt: new Date().toISOString(),
      ...recordData
    };
    const updated = [newRecord, ...records];
    setRecords(updated);
    await Storage.saveRecords(currentUser.id, activeSheet.id, updated);
  };

  const handleDeleteRecord = async (recordId) => {
    if (!currentUser || !activeSheet) return;
    const updated = records.filter(r => r._id !== recordId);
    setRecords(updated);
    await Storage.saveRecords(currentUser.id, activeSheet.id, updated);
  };

  const handleUpdateRecord = async (recordId, updatedFields) => {
    if (!currentUser || !activeSheet) return;
    const updated = records.map(r => r._id === recordId ? { ...r, ...updatedFields } : r);
    setRecords(updated);
    await Storage.saveRecords(currentUser.id, activeSheet.id, updated);
  };

  const handleExport = () => {
    if (!activeSheet) return;
    exportToExcel(activeSheet.columns, records, activeSheet.name);
  };

  const handleSaveCloudConfig = (e) => {
    e.preventDefault();
    localStorage.setItem('qe_supabase_url', supabaseUrl.trim());
    localStorage.setItem('qe_supabase_anon_key', supabaseAnonKey.trim());
    setCloudSaved(true);
    setTimeout(() => {
      window.location.reload();
    }, 1000);
  };

  if (!currentUser) {
    return <AuthModal onAuthSuccess={handleAuthSuccess} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col antialiased selection:bg-blue-100 selection:text-blue-900">
      <Navbar
        user={currentUser}
        onLogout={handleLogout}
        currentSheet={activeSheet}
        sheets={sheets}
        onSelectSheet={setActiveSheet}
        onNewSheet={() => {
          setIsEditingColumns(false);
          setShowColumnSetup(true);
        }}
        onEditColumns={() => {
          setIsEditingColumns(true);
          setShowColumnSetup(true);
        }}
        onExport={handleExport}
        recordCount={records.length}
        onOpenCloudSettings={() => setShowCloudModal(true)}
      />

      <main className="flex-1 max-w-6xl w-full mx-auto px-3 sm:px-4 md:px-6 py-4 sm:py-6 space-y-4 sm:space-y-6">
        {!activeSheet ? (
          /* Empty State: Create First Sheet */
          <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/80 p-6 sm:p-8 md:p-12 text-center max-w-xl mx-auto shadow-sm my-4 sm:my-8">
            <div className="w-12 h-12 sm:w-16 sm:h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-3.5 sm:mb-4">
              <LayoutGrid className="w-6 h-6 sm:w-8 sm:h-8" />
            </div>
            <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-slate-800">
              Create Your Data Entry Sheet
            </h2>
            <p className="text-slate-500 text-xs sm:text-sm mt-1.5 sm:mt-2 mb-5 sm:mb-6">
              Define your custom Excel columns (Text, Email, Numbers, Dates, Dropdowns) and start entering records row-by-row.
            </p>
            <button
              onClick={() => {
                setIsEditingColumns(false);
                setShowColumnSetup(true);
              }}
              className="inline-flex items-center gap-2 px-5 sm:px-6 py-2.5 sm:py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs sm:text-sm rounded-xl shadow-md transition active:scale-[0.99]"
            >
              <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
              <span>Define Columns & Start</span>
            </button>
          </div>
        ) : (
          /* Main Workspace */
          <div className="space-y-4 sm:space-y-6">
            {/* Sheet Sub-Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3 bg-white p-3.5 sm:p-4 rounded-xl sm:rounded-2xl border border-slate-200/80">
              <div className="min-w-0">
                <h2 className="text-base sm:text-lg font-bold text-slate-800 flex items-center gap-2 flex-wrap">
                  <span className="truncate">{activeSheet.name}</span>
                  <span className="text-[11px] font-normal text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                    {activeSheet.columns.length} Columns
                  </span>
                </h2>
                <div className="flex items-center gap-1.5 mt-0.5 text-[11px] sm:text-xs text-slate-500">
                  <span className={`inline-block w-2 h-2 rounded-full ${isSupabaseConfigured ? 'bg-emerald-500 animate-pulse' : 'bg-blue-500'}`}></span>
                  <span>{isSupabaseConfigured ? 'Cloud Database Active (Syncs to all devices)' : 'Offline Local Storage'}</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setIsEditingColumns(true);
                    setShowColumnSetup(true);
                  }}
                  className="md:hidden inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
                >
                  <Sliders className="w-3.5 h-3.5" />
                  <span>Configure Columns</span>
                </button>
              </div>
            </div>

            {/* Form Section */}
            <DataEntryForm
              columns={activeSheet.columns}
              onAddRecord={handleAddRecord}
              recordNumber={records.length + 1}
            />

            {/* Table Section */}
            <DataTable
              columns={activeSheet.columns}
              records={records}
              onDeleteRecord={handleDeleteRecord}
              onUpdateRecord={handleUpdateRecord}
            />
          </div>
        )}
      </main>

      {/* Column Setup Modal */}
      {showColumnSetup && (
        <ColumnSetup
          initialSheet={isEditingColumns ? activeSheet : null}
          onSave={handleSaveSheet}
          onCancel={() => setShowColumnSetup(false)}
        />
      )}

      {/* Cloud Settings Modal */}
      {showCloudModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl p-5 sm:p-6 border border-slate-100">
            <div className="flex items-center gap-2.5 mb-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold">
                <Cloud className="w-4 h-4" />
              </div>
              <h3 className="font-bold text-slate-800 text-sm sm:text-base">
                Cross-Device Cloud Database (Supabase)
              </h3>
            </div>
            <p className="text-xs text-slate-500 mb-4 leading-relaxed">
              Connect your free Supabase database (<a href="https://supabase.com" target="_blank" rel="noreferrer" className="text-blue-600 underline font-medium">supabase.com</a>) to automatically sync your sheets and records across PC, laptop, and mobile phones!
            </p>

            {cloudSaved && (
              <div className="mb-3 p-2.5 bg-emerald-50 text-emerald-700 rounded-lg text-xs font-semibold flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" />
                <span>Cloud settings saved! Refreshing...</span>
              </div>
            )}

            <form onSubmit={handleSaveCloudConfig} className="space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 uppercase mb-1">Project URL</label>
                <input
                  type="text"
                  placeholder="https://xyzcompany.supabase.co"
                  value={supabaseUrl}
                  onChange={(e) => setSupabaseUrl(e.target.value)}
                  required
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 uppercase mb-1">Anon / Public API Key</label>
                <input
                  type="password"
                  placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6..."
                  value={supabaseAnonKey}
                  onChange={(e) => setSupabaseAnonKey(e.target.value)}
                  required
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCloudModal(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg transition"
                >
                  Close
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition"
                >
                  Save & Connect
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PWA Install Banner */}
      <PWAInstallPrompt />
    </div>
  );
}
