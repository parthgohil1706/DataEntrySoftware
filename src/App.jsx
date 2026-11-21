import React, { useState, useEffect } from 'react';
import { Storage } from './utils/storage';
import { exportToExcel } from './utils/excel';
import Navbar from './components/Navbar';
import AuthModal from './components/AuthModal';
import ColumnSetup from './components/ColumnSetup';
import DataEntryForm from './components/DataEntryForm';
import DataTable from './components/DataTable';
import PWAInstallPrompt from './components/PWAInstallPrompt';
import { LayoutGrid, Plus, Sliders } from 'lucide-react';

export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [sheets, setSheets] = useState([]);
  const [activeSheet, setActiveSheet] = useState(null);
  const [records, setRecords] = useState([]);
  const [showColumnSetup, setShowColumnSetup] = useState(false);
  const [isEditingColumns, setIsEditingColumns] = useState(false);

  // 1. Initial Load of Auth
  useEffect(() => {
    const user = Storage.getCurrentUser();
    if (user) {
      setCurrentUser(user);
    }
  }, []);

  // 2. Load Sheets for User
  useEffect(() => {
    if (currentUser) {
      const userSheets = Storage.getSheets(currentUser.id);
      setSheets(userSheets);
      if (userSheets.length > 0) {
        setActiveSheet(userSheets[0]);
      } else {
        setActiveSheet(null);
      }
    } else {
      setSheets([]);
      setActiveSheet(null);
      setRecords([]);
    }
  }, [currentUser]);

  // 3. Load Records for Active Sheet
  useEffect(() => {
    if (currentUser && activeSheet) {
      const sheetRecords = Storage.getRecords(currentUser.id, activeSheet.id);
      setRecords(sheetRecords);
    } else {
      setRecords([]);
    }
  }, [currentUser, activeSheet]);

  // Handlers
  const handleAuthSuccess = (user) => {
    setCurrentUser(user);
  };

  const handleLogout = () => {
    Storage.logout();
    setCurrentUser(null);
  };

  const handleSaveSheet = (sheetConfig) => {
    let updated;
    const exists = sheets.find(s => s.id === sheetConfig.id);
    if (exists) {
      updated = sheets.map(s => s.id === sheetConfig.id ? sheetConfig : s);
    } else {
      updated = [...sheets, sheetConfig];
    }
    setSheets(updated);
    Storage.saveSheets(currentUser.id, updated);
    setActiveSheet(sheetConfig);
    setShowColumnSetup(false);
    setIsEditingColumns(false);
  };

  const handleAddRecord = (recordData) => {
    if (!currentUser || !activeSheet) return;
    const newRecord = {
      _id: 'row_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
      createdAt: new Date().toISOString(),
      ...recordData
    };
    const updated = [newRecord, ...records];
    setRecords(updated);
    Storage.saveRecords(currentUser.id, activeSheet.id, updated);
  };

  const handleDeleteRecord = (recordId) => {
    if (!currentUser || !activeSheet) return;
    const updated = records.filter(r => r._id !== recordId);
    setRecords(updated);
    Storage.saveRecords(currentUser.id, activeSheet.id, updated);
  };

  const handleUpdateRecord = (recordId, updatedFields) => {
    if (!currentUser || !activeSheet) return;
    const updated = records.map(r => r._id === recordId ? { ...r, ...updatedFields } : r);
    setRecords(updated);
    Storage.saveRecords(currentUser.id, activeSheet.id, updated);
  };

  const handleExport = () => {
    if (!activeSheet) return;
    exportToExcel(activeSheet.columns, records, activeSheet.name);
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
                  <span className="inline-block w-2 h-2 rounded-full bg-emerald-500"></span>
                  <span>Auto-Save Active (Safe Local Storage)</span>
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

      {/* PWA Install Banner */}
      <PWAInstallPrompt />
    </div>
  );
}
