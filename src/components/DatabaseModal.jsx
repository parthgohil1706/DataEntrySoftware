import React, { useState, useEffect } from 'react';
import { Database, Cloud, Server, CheckCircle2, AlertCircle, ExternalLink, Copy, Check, ShieldCheck, Zap } from 'lucide-react';
import { getSupabaseConfig, saveSupabaseCredentials, testSupabaseConnection } from '../utils/supabase';

export default function DatabaseModal({ onClose, mysqlStatus }) {
  const [activeTab, setActiveTab] = useState('supabase'); // 'supabase' | 'mysql' | 'compare'
  const [supabaseUrl, setSupabaseUrl] = useState('');
  const [supabaseKey, setSupabaseKey] = useState('');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const config = getSupabaseConfig();
    setSupabaseUrl(config.url);
    setSupabaseKey(config.key);
    if (config.isConfigured) {
      testSupabaseConnection().then(res => setTestResult(res));
    }
  }, []);

  const handleSaveSupabase = async (e) => {
    e.preventDefault();
    setTesting(true);
    setTestResult(null);

    saveSupabaseCredentials(supabaseUrl, supabaseKey);
    const result = await testSupabaseConnection();
    setTestResult(result);
    setTesting(false);
  };

  const handleCopySql = () => {
    const sql = `-- QuickEntry Supabase Schema
CREATE TABLE IF NOT EXISTS public.app_users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    reset_otp JSONB,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.sheets (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    columns JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.records (
    id TEXT PRIMARY KEY,
    sheet_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    data JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.app_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sheets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.records ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow all access to app_users') THEN
        CREATE POLICY "Allow all access to app_users" ON public.app_users FOR ALL USING (true) WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow all access to sheets') THEN
        CREATE POLICY "Allow all access to sheets" ON public.sheets FOR ALL USING (true) WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow all access to records') THEN
        CREATE POLICY "Allow all access to records" ON public.records FOR ALL USING (true) WITH CHECK (true);
    END IF;
END $$;`;

    navigator.clipboard.writeText(sql);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-in fade-in">
      <div className="bg-white w-full max-w-xl rounded-2xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold">
              <Database className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-sm sm:text-base leading-tight">
                Database & Cloud Multi-Device Sync
              </h3>
              <p className="text-[11px] text-slate-500">
                Access your sheets & data from any phone, laptop, or PC
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/50 transition text-sm"
          >
            ✕
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 px-5 bg-slate-50/50">
          <button
            onClick={() => setActiveTab('supabase')}
            className={`py-2.5 px-3 text-xs font-semibold border-b-2 transition flex items-center gap-1.5 ${
              activeTab === 'supabase'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Cloud className="w-3.5 h-3.5" />
            <span>Supabase Cloud (Best)</span>
            <span className="bg-emerald-100 text-emerald-700 text-[10px] px-1.5 py-0.2 rounded-full font-bold">
              Free Forever
            </span>
          </button>

          <button
            onClick={() => setActiveTab('mysql')}
            className={`py-2.5 px-3 text-xs font-semibold border-b-2 transition flex items-center gap-1.5 ${
              activeTab === 'mysql'
                ? 'border-blue-600 text-blue-700'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Server className="w-3.5 h-3.5" />
            <span>MySQL</span>
          </button>

          <button
            onClick={() => setActiveTab('compare')}
            className={`py-2.5 px-3 text-xs font-semibold border-b-2 transition flex items-center gap-1.5 ${
              activeTab === 'compare'
                ? 'border-purple-600 text-purple-700'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Why Supabase?</span>
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto space-y-4">
          {activeTab === 'supabase' && (
            <div className="space-y-4">
              {/* Status Banner */}
              <div className={`p-3 rounded-xl border flex items-start gap-2.5 text-xs ${
                testResult?.connected
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : 'bg-slate-50 border-slate-200 text-slate-700'
              }`}>
                {testResult?.connected ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                )}
                <div>
                  <div className="font-semibold">
                    {testResult?.connected ? 'Supabase Cloud Database Connected!' : 'Supabase Not Connected Yet'}
                  </div>
                  <div className="text-[11px] mt-0.5 text-slate-600">
                    {testResult?.message || testResult?.error || 'Create a free project at supabase.com to sync your data to any device.'}
                  </div>
                </div>
              </div>

              {/* Form */}
              <form onSubmit={handleSaveSupabase} className="space-y-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Supabase Project URL
                  </label>
                  <input
                    type="url"
                    value={supabaseUrl}
                    onChange={(e) => setSupabaseUrl(e.target.value)}
                    placeholder="https://yourprojectid.supabase.co"
                    className="w-full text-xs font-mono px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Supabase Anon Public API Key
                  </label>
                  <input
                    type="password"
                    value={supabaseKey}
                    onChange={(e) => setSupabaseKey(e.target.value)}
                    placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                    className="w-full text-xs font-mono px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    Safe to use on mobile & web. Found in Supabase Dashboard &rarr; Project Settings &rarr; API.
                  </p>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="submit"
                    disabled={testing}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow-sm transition disabled:opacity-50 flex items-center gap-1.5"
                  >
                    {testing ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Connecting...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Save & Connect</span>
                      </>
                    )}
                  </button>

                  <a
                    href="https://supabase.com"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition border border-slate-200"
                  >
                    <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
                    <span>Create Free Account (No Card)</span>
                  </a>
                </div>
              </form>

              {/* Instructions & SQL copy */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-700">Quick 2-Step Supabase Setup:</span>
                  <button
                    onClick={handleCopySql}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 hover:text-emerald-800 bg-white border border-emerald-200 px-2 py-0.5 rounded shadow-xs"
                  >
                    {copied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                    <span>{copied ? 'Copied SQL!' : 'Copy SQL Script'}</span>
                  </button>
                </div>
                <ol className="list-decimal list-inside space-y-1 text-[11px] text-slate-600">
                  <li>Go to your Supabase project &rarr; <b>SQL Editor</b>.</li>
                  <li>Click <b>Copy SQL Script</b> above, paste it, and click <b>Run</b>. Done!</li>
                </ol>
              </div>
            </div>
          )}

          {activeTab === 'mysql' && (
            <div className="space-y-3">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5 text-xs text-slate-700">
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-slate-500">Status:</span>
                  <span className={`font-bold flex items-center gap-1 ${mysqlStatus?.connected ? 'text-emerald-600' : 'text-amber-600'}`}>
                    {mysqlStatus?.connected ? '✓ Connected' : 'Offline / Standby'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-slate-500">Host:</span>
                  <span className="font-mono text-slate-800">{mysqlStatus?.host || '127.0.0.1:3306'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-slate-500">Database:</span>
                  <span className="font-mono text-slate-800">{mysqlStatus?.database || 'quickentry_db'}</span>
                </div>
              </div>

              <p className="text-xs text-slate-500 leading-relaxed">
                MySQL runs locally on your PC via XAMPP, WAMP, or MySQL Server. Configure credentials in your <code className="bg-slate-100 px-1 py-0.5 rounded text-blue-600 font-mono">.env</code> file.
              </p>
            </div>
          )}

          {activeTab === 'compare' && (
            <div className="space-y-3 text-xs">
              <h4 className="font-bold text-slate-800 text-sm">
                Why Supabase is the Best Long-Term Free Choice:
              </h4>

              {/* Supabase card */}
              <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl">
                <div className="flex items-center justify-between font-bold text-emerald-800 mb-1">
                  <span>1. Supabase (Winner 🏆)</span>
                  <span className="text-[10px] bg-emerald-600 text-white px-2 py-0.5 rounded-full">Recommended</span>
                </div>
                <ul className="list-disc list-inside space-y-1 text-slate-700 text-[11px]">
                  <li><b>Free Forever</b> (Does not expire after 1 year).</li>
                  <li><b>No credit card required</b> to sign up or use.</li>
                  <li><b>500 MB PostgreSQL storage</b> (stores over 1,000,000+ data rows).</li>
                  <li><b>Works directly on mobile & PWA</b> via secure HTTPS REST API.</li>
                </ul>
              </div>

              {/* AWS card */}
              <div className="p-3 bg-rose-50/70 border border-rose-200 rounded-xl">
                <div className="flex items-center justify-between font-bold text-rose-800 mb-1">
                  <span>2. AWS Free Tier (Not Long Term ❌)</span>
                  <span className="text-[10px] bg-rose-600 text-white px-2 py-0.5 rounded-full">12-Month Limit</span>
                </div>
                <p className="text-slate-600 text-[11px] leading-relaxed">
                  AWS RDS is only free for the <b>first 12 months</b>. After 1 year, AWS automatically charges your credit card $15–$25 every month.
                </p>
              </div>

              {/* Azure card */}
              <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl">
                <div className="flex items-center justify-between font-bold text-amber-800 mb-1">
                  <span>3. Azure SQL Database (Complex ⚠️)</span>
                  <span className="text-[10px] bg-amber-600 text-white px-2 py-0.5 rounded-full">Monthly Caps</span>
                </div>
                <p className="text-slate-600 text-[11px] leading-relaxed">
                  Requires Microsoft Azure subscription with credit card. Has 100,000 monthly vCore second limits, strict IP firewall blocks, and cannot be accessed directly from a mobile browser without a server.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 text-xs bg-slate-200 hover:bg-slate-300 text-slate-700 font-medium rounded-lg transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
