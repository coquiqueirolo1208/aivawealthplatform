-- AIVA Wealth Platform schema.
-- Mirrors the data model of dashboard_patrimonial_13.html: per-advisor client books
-- (RLS-scoped) plus firm-wide reference/catalog data (readable by any advisor).

create extension if not exists pgcrypto with schema extensions;

-- =========================================================================
-- Per-advisor data
-- =========================================================================

create table advisors (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null default '',
  email text not null,
  created_at timestamptz not null default now()
);

create table clients (
  id uuid primary key default gen_random_uuid(),
  advisor_id uuid not null references advisors (id) on delete cascade,
  name text not null,
  fecha_nacimiento date,
  direccion text,
  email text,
  celular text,
  pareja text,
  hijos text,
  is_demo boolean not null default false,
  created_at timestamptz not null default now()
);
create index clients_advisor_id_idx on clients (advisor_id);

create table client_documents (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients (id) on delete cascade,
  tipo text not null,
  estado text not null default 'pendiente', -- 'vigente' | 'pendiente'
  vencimiento date,
  notas text
);
create index client_documents_client_id_idx on client_documents (client_id);

create table risk_profiles (
  client_id uuid primary key references clients (id) on delete cascade,
  answers jsonb not null, -- {horizonte, perdida, experiencia, objetivo, liquidez}
  score int not null,
  profile text not null, -- 'conservador' | 'balanceado' | 'dinamico'
  completed_at timestamptz not null default now()
);

create table accounts (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients (id) on delete cascade,
  label text not null,
  custodian text,
  account_number text,
  comentario text
);
create index accounts_client_id_idx on accounts (client_id);

create table snapshots (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts (id) on delete cascade,
  month char(7) not null, -- 'YYYY-MM'
  valor_actual numeric,
  valor_inicial numeric,
  valor_activos numeric,
  valor_pasivos numeric,
  flujos_netos numeric,
  flujos_netos_ytd numeric,
  costos_mes numeric,
  rent_mtd numeric,
  rent_mtd_metodo text, -- 'informado' | 'estimado' | 'calculado' | 'no_disponible'
  rent_ytd numeric,
  rent_ytd_metodo text,
  moneda text default 'USD',
  asignacion jsonb not null default '[]', -- [{tipo, valor}]
  holdings jsonb not null default '[]', -- [{nombre, valor, retornoPct}]
  highlights text[] not null default '{}',
  movimientos text[] not null default '{}',
  unique (account_id, month)
);
create index snapshots_account_id_idx on snapshots (account_id);

create table tasks (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients (id) on delete cascade,
  title text not null,
  due date,
  done boolean not null default false
);
create index tasks_client_id_idx on tasks (client_id);

create table prospects (
  id uuid primary key default gen_random_uuid(),
  advisor_id uuid not null references advisors (id) on delete cascade,
  name text not null,
  empresa text,
  fuente text,
  aum_estimado numeric,
  proxima_accion text,
  proxima_fecha date,
  notas text,
  stage text not null default 'nuevo',
  created_at timestamptz not null default now(),
  converted_client_id uuid references clients (id) on delete set null
);
create index prospects_advisor_id_idx on prospects (advisor_id);

create table advisor_metrics (
  advisor_id uuid primary key references advisors (id) on delete cascade,
  aum jsonb not null default '{}', -- {Efectivo, "Renta Fija", "Renta Variable", "Fondos Mutuos", Alternativos, Otros}
  aum_inicio_ano numeric,
  comisiones_q numeric,
  entradas_nuevos_clientes numeric,
  entradas_clientes_existentes numeric,
  salidas numeric,
  n_clientes numeric
);

create table recommendations_cache (
  client_id uuid primary key references clients (id) on delete cascade,
  fecha date,
  resumen_mercado text,
  cambiar jsonb not null default '[]',
  mantener_con_condicion jsonb not null default '[]',
  estructurales jsonb not null default '[]',
  fingerprint text
);

create table meeting_prep_cache (
  client_id uuid primary key references clients (id) on delete cascade,
  text text,
  generated_at timestamptz,
  suggestions text
);

-- =========================================================================
-- Firm-wide reference data (readable by any authenticated advisor)
-- =========================================================================

create table benchmark_levels (
  month char(7) primary key, -- 'YYYY-MM'
  msci numeric,
  agg numeric
);

create table daily_reports (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  title text,
  content text,
  file_path text, -- Storage object path in the 'daily-reports' bucket
  created_by uuid references advisors (id) on delete set null,
  created_at timestamptz not null default now()
);

create table funds (
  isin text primary key,
  name text not null,
  cat text,
  sub text,
  rt numeric,
  d1 numeric, w1 numeric, m1 numeric, qtd numeric,
  ytd numeric, y1 numeric, y3 numeric, y5 numeric, si numeric,
  y2021 numeric, y2022 numeric, y2023 numeric, y2024 numeric, y2025 numeric,
  sh3 numeric, sh5 numeric,
  aum numeric
);

-- isin_acc is NOT used as the primary key: the source spreadsheet uses "-" as a
-- placeholder for funds/ETFs without an accumulating share class, so it isn't
-- reliably unique.
create table ideas_funds (
  id uuid primary key default gen_random_uuid(),
  isin_acc text,
  name text not null,
  class text,
  sector text,
  subsector text,
  currency text,
  ytd numeric, ret1y numeric, ret3y numeric, ret5y numeric,
  min_invest numeric,
  vol3y numeric,
  sharpe3y numeric,
  expense_ratio numeric,
  dvd_yield numeric,
  dvd_freq text,
  isin_dist text,
  inception_date text,
  ticker text
);

-- Same reasoning as ideas_funds above: isin_acc is "-" for several real ETFs.
create table ideas_etfs (
  id uuid primary key default gen_random_uuid(),
  isin_acc text,
  name text not null,
  sector text,
  subsector text,
  ticker_acc text,
  ticker_dist text,
  manager text,
  strategy text,
  inception text,
  total_assets_m numeric,
  price numeric,
  ytd numeric, ret1y numeric, ret3y numeric,
  isin_dist text,
  dvd_yield numeric,
  cost numeric
);

create table ideas_bonds (
  isin text primary key,
  issuer text not null,
  sector text,
  subsector text,
  maturity text,
  coupon numeric,
  coupon_type text,
  price numeric,
  ytm numeric,
  min_piece numeric,
  increment numeric,
  country text,
  seniority text,
  rule144a text,
  rating_sp text,
  rating_moody text,
  duration numeric,
  callable text,
  next_call text,
  ytc numeric,
  outstanding text
);

create table ideas_stocks (
  isin text primary key,
  name text not null,
  sector text,
  industry text,
  ticker text,
  currency text,
  price numeric,
  target_median numeric,
  exp_growth numeric,
  dvd_yield numeric,
  ytd numeric, ret1y numeric, ret3y numeric, ret5y numeric,
  vol6m numeric,
  country text,
  mkt_cap_b numeric
);

create table model_portfolios (
  key text primary key, -- 'conservador' | 'balanceado' | 'dinamico'
  label text not null,
  cash numeric not null default 0
);

create table model_portfolio_holdings (
  id uuid primary key default gen_random_uuid(),
  portfolio_key text not null references model_portfolios (key) on delete cascade,
  isin text,
  name text not null,
  sector text,
  section text not null, -- 'Renta Fija' | 'Multi Activo' | 'Renta Variable'
  weight numeric not null
);
create index model_portfolio_holdings_key_idx on model_portfolio_holdings (portfolio_key);

create table investec_solutions (
  id text primary key,
  badge text,
  name text not null,
  isin text,
  risk text,
  equity_range text,
  alloc_key text,
  yd_key text,
  tipo_rf_key text,
  full_name text,
  evo_key text
);

create table investec_classes (
  id uuid primary key default gen_random_uuid(),
  solution_id text not null references investec_solutions (id) on delete cascade,
  class_name text not null,
  isin_acc text,
  isin_dist text,
  management_fee_bps numeric,
  ter_pct numeric,
  all_in_pct numeric
);
create index investec_classes_solution_id_idx on investec_classes (solution_id);

-- Deeply-nested, display-only Investec catalog data (fundAllocation, yd, top10,
-- regional, tipoRentaFija, aaTiempo, fundInfo) is never edited via the UI and never
-- joined in SQL — the original matching/aggregation logic (matchInvestecFundPerf,
-- investecBuildManagerOverlap, etc.) is plain JS over in-memory objects. Storing it
-- as one JSONB blob avoids normalizing ~10 tables purely for data nobody queries
-- relationally; the app fetches the row and runs the same ported TS logic over it.
create table reference_data (
  key text primary key,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

-- =========================================================================
-- Auto-create an advisors row on signup
-- =========================================================================

create function public.handle_new_advisor()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.advisors (id, email)
  values (new.id, new.email);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_advisor();
