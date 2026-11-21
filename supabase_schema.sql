-- ====================================================================
-- QuickEntry Cloud Database Setup (Supabase PostgreSQL)
-- ====================================================================
-- How to apply:
-- 1. Create a free project at https://supabase.com
-- 2. Go to the "SQL Editor" in your Supabase dashboard
-- 3. Paste this script and click "Run" (Green button)
-- ====================================================================

-- 1. Users Table (Stores user login & password recovery info)
CREATE TABLE IF NOT EXISTS public.app_users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    reset_otp JSONB,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Sheet Templates Table (Stores your custom columns dynamically)
CREATE TABLE IF NOT EXISTS public.sheets (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    columns JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Records Table (Stores entered row values per sheet)
CREATE TABLE IF NOT EXISTS public.records (
    id TEXT PRIMARY KEY,
    sheet_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    data JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security (RLS) with full access policies
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
END $$;

-- Fast search indexes
CREATE INDEX IF NOT EXISTS idx_sheets_user_id ON public.sheets(user_id);
CREATE INDEX IF NOT EXISTS idx_records_sheet_user ON public.records(sheet_id, user_id);
