import React, { useState, useEffect, useRef } from 'react';
import { PlusCircle, RotateCcw, Check, AlertCircle, Mail } from 'lucide-react';
import { isEmailColumn, isValidEmail } from '../utils/validation';

export default function DataEntryForm({ columns, onAddRecord, recordNumber }) {
  const [formData, setFormData] = useState({});
  const [errors, setErrors] = useState({});
  const [savedBadge, setSavedBadge] = useState(false);
  const firstInputRef = useRef(null);

  // Initialize blank form based on dynamic columns
  const getInitialState = () => {
    const init = {};
    columns.forEach(col => {
      init[col.id] = col.type === 'boolean' ? false : '';
    });
    return init;
  };

  useEffect(() => {
    setFormData(getInitialState());
    setErrors({});
    if (firstInputRef.current) {
      firstInputRef.current.focus();
    }
  }, [columns]);

  const handleChange = (col, value) => {
    setFormData(prev => ({ ...prev, [col.id]: value }));

    // Real-time validation for email
    if (isEmailColumn(col)) {
      if (value.trim() && !isValidEmail(value)) {
        setErrors(prev => ({
          ...prev,
          [col.id]: 'Must be a valid email format (e.g. user@example.com)'
        }));
      } else {
        setErrors(prev => {
          const next = { ...prev };
          delete next[col.id];
          return next;
        });
      }
    } else {
      if (errors[col.id]) {
        setErrors(prev => {
          const next = { ...prev };
          delete next[col.id];
          return next;
        });
      }
    }
  };

  const handleReset = () => {
    setFormData(getInitialState());
    setErrors({});
    if (firstInputRef.current) {
      firstInputRef.current.focus();
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const newErrors = {};

    // 1. Validate required fields
    for (let col of columns) {
      const val = formData[col.id];
      if (col.required && (!val && val !== false && val !== 0)) {
        newErrors[col.id] = `"${col.name}" is required.`;
      }
    }

    // 2. Strict Email Validation
    for (let col of columns) {
      if (isEmailColumn(col)) {
        const emailVal = (formData[col.id] || '').trim();
        if (emailVal && !isValidEmail(emailVal)) {
          newErrors[col.id] = `Please enter a strictly valid email (e.g. user@example.com). Names or random text are not allowed.`;
        } else if (col.required && !emailVal) {
          newErrors[col.id] = `Email is required and must be valid.`;
        }
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    onAddRecord(formData);

    // Show temporary feedback badge
    setSavedBadge(true);
    setTimeout(() => setSavedBadge(false), 1800);

    // Reset for next record
    handleReset();
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-4 sm:p-5 md:p-6 transition">
      {/* Form Card Header */}
      <div className="flex items-center justify-between pb-3 sm:pb-4 mb-3 sm:mb-4 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <span className="bg-blue-100 text-blue-700 text-xs font-bold px-2.5 py-1 rounded-full uppercase tracking-wider">
            Record #{recordNumber}
          </span>
          <span className="text-xs text-slate-500 hidden sm:inline">
            Fill fields and press save to record entry
          </span>
        </div>

        {savedBadge && (
          <div className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full animate-pulse">
            <Check className="w-3.5 h-3.5" />
            <span>Row Saved!</span>
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-3.5 sm:space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
          {columns.map((col, idx) => {
            const isFirst = idx === 0;
            const hasError = !!errors[col.id];
            const isEmail = isEmailColumn(col);
            const value = formData[col.id] ?? '';
            const isEmailValid = isEmail && value.trim() && isValidEmail(value);

            // Textarea
            if (col.type === 'textarea') {
              return (
                <div key={col.id} className="md:col-span-2">
                  <label className="block text-[11px] sm:text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1 sm:mb-1.5">
                    {col.name} {col.required && <span className="text-rose-500">*</span>}
                  </label>
                  <textarea
                    rows={2}
                    value={value}
                    onChange={(e) => handleChange(col, e.target.value)}
                    required={col.required}
                    placeholder={`Enter ${col.name.toLowerCase()}...`}
                    className={`w-full px-3.5 py-2.5 bg-slate-50 border rounded-xl text-base sm:text-sm focus:outline-none focus:ring-2 focus:bg-white transition ${
                      hasError ? 'border-rose-400 focus:ring-rose-400' : 'border-slate-200 focus:ring-blue-500'
                    }`}
                  />
                  {hasError && (
                    <p className="text-[11px] text-rose-500 mt-1 font-medium flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      <span>{errors[col.id]}</span>
                    </p>
                  )}
                </div>
              );
            }

            // Dropdown Select
            if (col.type === 'select') {
              const options = (col.options || '')
                .split(',')
                .map(o => o.trim())
                .filter(Boolean);

              return (
                <div key={col.id}>
                  <label className="block text-[11px] sm:text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1 sm:mb-1.5">
                    {col.name} {col.required && <span className="text-rose-500">*</span>}
                  </label>
                  <select
                    value={value}
                    onChange={(e) => handleChange(col, e.target.value)}
                    required={col.required}
                    className={`w-full px-3.5 py-2.5 bg-slate-50 border rounded-xl text-base sm:text-sm focus:outline-none focus:ring-2 focus:bg-white transition text-slate-700 font-medium ${
                      hasError ? 'border-rose-400 focus:ring-rose-400' : 'border-slate-200 focus:ring-blue-500'
                    }`}
                  >
                    <option value="">-- Choose {col.name} --</option>
                    {options.map((opt, i) => (
                      <option key={i} value={opt}>{opt}</option>
                    ))}
                  </select>
                  {hasError && (
                    <p className="text-[11px] text-rose-500 mt-1 font-medium flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      <span>{errors[col.id]}</span>
                    </p>
                  )}
                </div>
              );
            }

            // Boolean Checkbox
            if (col.type === 'boolean') {
              return (
                <div key={col.id} className="flex items-center h-full pt-2 sm:pt-4">
                  <label className="inline-flex items-center gap-2.5 text-sm font-medium text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={!!value}
                      onChange={(e) => handleChange(col, e.target.checked)}
                      className="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                    />
                    <span>{col.name}</span>
                  </label>
                </div>
              );
            }

            // Strict Email Input
            if (isEmail) {
              return (
                <div key={col.id}>
                  <div className="flex items-center justify-between mb-1 sm:mb-1.5">
                    <label className="block text-[11px] sm:text-xs font-semibold text-slate-700 uppercase tracking-wider">
                      {col.name} {col.required && <span className="text-rose-500">*</span>}
                    </label>
                    {isEmailValid && (
                      <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-0.5">
                        <Check className="w-3 h-3" /> Valid email
                      </span>
                    )}
                  </div>
                  <div className="relative">
                    <Mail className={`w-4 h-4 absolute left-3.5 top-3.5 transition ${
                      hasError ? 'text-rose-400' : isEmailValid ? 'text-emerald-500' : 'text-slate-400'
                    }`} />
                    <input
                      ref={isFirst ? firstInputRef : null}
                      type="email"
                      value={value}
                      onChange={(e) => handleChange(col, e.target.value)}
                      required={col.required}
                      placeholder="user@example.com"
                      autoComplete="email"
                      className={`w-full pl-10 pr-4 py-2.5 bg-slate-50 border rounded-xl text-base sm:text-sm focus:outline-none focus:ring-2 focus:bg-white transition ${
                        hasError 
                          ? 'border-rose-400 focus:ring-rose-400 bg-rose-50/20' 
                          : isEmailValid 
                            ? 'border-emerald-300 focus:ring-emerald-400' 
                            : 'border-slate-200 focus:ring-blue-500'
                      }`}
                    />
                  </div>
                  {hasError && (
                    <p className="text-[11px] text-rose-500 mt-1 font-medium flex items-center gap-1">
                      <AlertCircle className="w-3 h-3 shrink-0" />
                      <span>{errors[col.id]}</span>
                    </p>
                  )}
                </div>
              );
            }

            // Standard Inputs (Number, Date, Text)
            let inputType = 'text';
            if (col.type === 'number') inputType = 'number';
            if (col.type === 'date') inputType = 'date';

            return (
              <div key={col.id}>
                <label className="block text-[11px] sm:text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1 sm:mb-1.5">
                  {col.name} {col.required && <span className="text-rose-500">*</span>}
                </label>
                <input
                  ref={isFirst ? firstInputRef : null}
                  type={inputType}
                  step={col.type === 'number' ? 'any' : undefined}
                  value={value}
                  onChange={(e) => handleChange(col, e.target.value)}
                  required={col.required}
                  placeholder={`Enter ${col.name.toLowerCase()}...`}
                  className={`w-full px-3.5 py-2.5 bg-slate-50 border rounded-xl text-base sm:text-sm focus:outline-none focus:ring-2 focus:bg-white transition ${
                    hasError ? 'border-rose-400 focus:ring-rose-400' : 'border-slate-200 focus:ring-blue-500'
                  }`}
                />
                {hasError && (
                  <p className="text-[11px] text-rose-500 mt-1 font-medium flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    <span>{errors[col.id]}</span>
                  </p>
                )}
              </div>
            );
          })}
        </div>

        {/* Action Buttons */}
        <div className="pt-3 sm:pt-4 flex items-center justify-between gap-2.5 border-t border-slate-100">
          <button
            type="button"
            onClick={handleReset}
            className="px-3 sm:px-3.5 py-2.5 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-xl transition inline-flex items-center gap-1.5 shrink-0"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden xs:inline">Clear</span>
          </button>

          <button
            type="submit"
            className="flex-1 max-w-full sm:max-w-xs ml-auto py-2.5 sm:py-2.5 px-4 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold text-xs sm:text-sm rounded-xl shadow-sm transition inline-flex items-center justify-center gap-1.5 sm:gap-2 min-h-[42px]"
          >
            <PlusCircle className="w-4 h-4 shrink-0" />
            <span className="truncate">Save & Next Record</span>
          </button>
        </div>
      </form>
    </div>
  );
}
