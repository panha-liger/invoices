-- ============================================================
-- Invoice Management System — Initial Schema
-- ============================================================

-- Accounts
CREATE TABLE IF NOT EXISTS accounts (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT now()
);

INSERT INTO accounts (name) VALUES ('RE:AI'), ('neWwave')
ON CONFLICT (name) DO NOTHING;

-- Vendors
CREATE TABLE IF NOT EXISTS vendors (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Invoices
CREATE TABLE IF NOT EXISTS invoices (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id       UUID NOT NULL REFERENCES accounts(id),
  vendor_id        UUID REFERENCES vendors(id),
  vendor_name_raw  TEXT,
  invoice_number   TEXT,
  invoice_date     DATE NOT NULL,
  due_date         DATE,
  currency         TEXT NOT NULL DEFAULT 'USD',
  subtotal         NUMERIC(12, 2),
  tax_amount       NUMERIC(12, 2) NOT NULL DEFAULT 0,
  tax_included     BOOLEAN NOT NULL DEFAULT false,
  total_amount     NUMERIC(12, 2) NOT NULL,
  category         TEXT NOT NULL DEFAULT 'other'
                   CHECK (category IN ('marketing','office','software','inventory','logistics','other')),
  category_source  TEXT NOT NULL DEFAULT 'ai'
                   CHECK (category_source IN ('ai','manual')),
  ai_confidence    NUMERIC(3,2),
  ai_raw_response  JSONB,
  status           TEXT NOT NULL DEFAULT 'pending'
                   CHECK (status IN ('pending','reviewed','approved','rejected')),
  is_duplicate     BOOLEAN NOT NULL DEFAULT false,
  duplicate_of     UUID REFERENCES invoices(id),
  file_hash        TEXT,
  notes            TEXT,
  created_at       TIMESTAMPTZ DEFAULT now(),
  updated_at       TIMESTAMPTZ DEFAULT now()
);

-- Invoice files
CREATE TABLE IF NOT EXISTS invoice_files (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id   UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  file_name    TEXT NOT NULL,
  file_type    TEXT NOT NULL,
  file_size    INT,
  is_primary   BOOLEAN NOT NULL DEFAULT true,
  created_at   TIMESTAMPTZ DEFAULT now()
);

-- Audit trail
CREATE TABLE IF NOT EXISTS invoice_edits (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id   UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  edited_by    UUID,
  field_name   TEXT NOT NULL,
  old_value    TEXT,
  new_value    TEXT,
  created_at   TIMESTAMPTZ DEFAULT now()
);

-- Export history
CREATE TABLE IF NOT EXISTS exports (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id    UUID REFERENCES accounts(id),
  period_year   INT NOT NULL,
  period_month  INT NOT NULL CHECK (period_month BETWEEN 1 AND 12),
  storage_path  TEXT,
  invoice_count INT,
  total_amount  NUMERIC(12, 2),
  created_by    UUID,
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- Indexes
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_invoices_account_date  ON invoices(account_id, invoice_date);
CREATE INDEX IF NOT EXISTS idx_invoices_status        ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_category      ON invoices(category);
CREATE INDEX IF NOT EXISTS idx_invoices_duplicate     ON invoices(is_duplicate) WHERE is_duplicate = true;
CREATE INDEX IF NOT EXISTS idx_invoices_file_hash     ON invoices(file_hash) WHERE file_hash IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_invoices_vendor        ON invoices(vendor_id);
CREATE INDEX IF NOT EXISTS idx_invoice_files_invoice  ON invoice_files(invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_edits_invoice  ON invoice_edits(invoice_id);

-- ============================================================
-- Auto-update updated_at
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER invoices_updated_at
  BEFORE UPDATE ON invoices
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- Storage buckets (run via Supabase dashboard or CLI)
-- ============================================================
-- bucket: invoices   (private, for uploaded invoice files)
-- bucket: exports    (private, for generated ZIP exports)
-- ============================================================

-- ============================================================
-- RLS Policies (enable after setting up auth)
-- ============================================================
ALTER TABLE accounts      ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendors       ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices      ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_edits ENABLE ROW LEVEL SECURITY;
ALTER TABLE exports       ENABLE ROW LEVEL SECURITY;

-- For internal use: allow all authenticated users full access
CREATE POLICY "authenticated full access" ON accounts
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "authenticated full access" ON vendors
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "authenticated full access" ON invoices
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "authenticated full access" ON invoice_files
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "authenticated full access" ON invoice_edits
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "authenticated full access" ON exports
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
