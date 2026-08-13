// Seeds DEMO_DATA (8 fictional clients with full portfolio history, tasks and
// prospects) under a given advisor. Unlike the firm-wide catalogs, this needs a
// real advisor_id to attach to (clients.advisor_id has no default), so it's a
// separate, explicit, opt-in step rather than part of seed-supabase.mjs.
//
// Requires env vars: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY.
// Usage: node scripts/seed-demo-data.mjs <advisor-uuid>

import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

const advisorId = process.argv[2];
const url = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!advisorId || !url || !serviceKey) {
  console.error("Usage: SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/seed-demo-data.mjs <advisor-uuid>");
  process.exit(1);
}

const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });
const demoDataPath = path.resolve(import.meta.dirname, "../supabase/seed-data/DEMO_DATA.json");
const demo = JSON.parse(fs.readFileSync(demoDataPath, "utf8"));

/** "DD/MM/YYYY" -> "YYYY-MM-DD" (ISO); passes through anything already ISO-like. */
function toIsoDate(s) {
  if (!s) return null;
  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(s);
  if (!m) return s;
  const [, d, mo, y] = m;
  return `${y}-${mo.padStart(2, "0")}-${d.padStart(2, "0")}`;
}

async function insertOne(table, row) {
  const { data, error } = await supabase.from(table).insert(row).select().single();
  if (error) throw new Error(`${table}: ${error.message}`);
  return data;
}

const clientIdMap = new Map(); // old string id -> new uuid
const accountIdMap = new Map(); // old string id -> new uuid

for (const client of demo.clients) {
  const row = await insertOne("clients", {
    advisor_id: advisorId,
    name: client.name,
    fecha_nacimiento: toIsoDate(client.fechaNacimiento),
    direccion: client.direccion ?? null,
    email: client.email ?? null,
    celular: client.celular ?? null,
    pareja: client.pareja ?? null,
    hijos: client.hijos ?? null,
    is_demo: true,
  });
  clientIdMap.set(client.id, row.id);
  console.log(`client ${client.name} -> ${row.id}`);

  if (client.documents?.length) {
    const docs = client.documents.map((d) => ({
      client_id: row.id,
      tipo: d.tipo,
      estado: d.estado,
      vencimiento: toIsoDate(d.vencimiento),
      notas: d.notas || null,
    }));
    const { error } = await supabase.from("client_documents").insert(docs);
    if (error) throw new Error(`client_documents: ${error.message}`);
  }

  if (client.riskProfile) {
    const rp = client.riskProfile;
    const { error } = await supabase.from("risk_profiles").insert({
      client_id: row.id,
      answers: rp.answers,
      score: rp.score,
      profile: rp.profile,
      completed_at: toIsoDate(rp.completedAt),
    });
    if (error) throw new Error(`risk_profiles: ${error.message}`);
  }

  const accounts = demo.accounts[client.id] || [];
  for (const acc of accounts) {
    const accRow = await insertOne("accounts", {
      client_id: row.id,
      label: acc.label,
      custodian: acc.custodian ?? null,
    });
    accountIdMap.set(acc.id, accRow.id);

    const snapsByMonth = demo.snapshots[client.id]?.[acc.id] || {};
    const snapRows = Object.entries(snapsByMonth).map(([month, s]) => ({
      account_id: accRow.id,
      month,
      valor_actual: s.valorActual ?? null,
      valor_inicial: s.valorInicial ?? null,
      valor_activos: s.valorActivos ?? null,
      valor_pasivos: s.valorPasivos ?? null,
      flujos_netos: s.flujosNetos ?? null,
      flujos_netos_ytd: s.flujosNetosYTD ?? null,
      costos_mes: s.costosMes ?? null,
      rent_mtd: s.rentMTD ?? null,
      rent_mtd_metodo: s.rentMTDMetodo ?? null,
      rent_ytd: s.rentYTD ?? null,
      rent_ytd_metodo: s.rentYTDMetodo ?? null,
      asignacion: s.asignacion || [],
      holdings: s.holdings || [],
      highlights: s.highlights || [],
      movimientos: s.movimientos || [],
    }));
    if (snapRows.length) {
      const { error } = await supabase.from("snapshots").insert(snapRows);
      if (error) throw new Error(`snapshots (${acc.label}): ${error.message}`);
    }
  }

  const tasks = demo.tasks[client.id] || [];
  if (tasks.length) {
    const { error } = await supabase.from("tasks").insert(
      tasks.map((t) => ({ client_id: row.id, title: t.title, due: toIsoDate(t.due), done: !!t.done })),
    );
    if (error) throw new Error(`tasks: ${error.message}`);
  }
}

if (demo.prospects?.length) {
  const rows = demo.prospects.map((p) => ({
    advisor_id: advisorId,
    name: p.name,
    empresa: p.empresa ?? null,
    fuente: p.fuente ?? null,
    aum_estimado: p.aumEstimado ?? null,
    proxima_accion: p.proximaAccion ?? null,
    proxima_fecha: toIsoDate(p.proximaFecha),
    notas: p.notas ?? null,
    stage: p.stage,
    created_at: p.createdAt ? new Date(toIsoDate(p.createdAt)).toISOString() : undefined,
    converted_client_id: p.convertedClientId ? clientIdMap.get(p.convertedClientId) ?? null : null,
  }));
  const { error } = await supabase.from("prospects").insert(rows);
  if (error) throw new Error(`prospects: ${error.message}`);
  console.log(`prospects: inserted ${rows.length}`);
}

if (demo.advisorMetrics) {
  const m = demo.advisorMetrics;
  const { error } = await supabase.from("advisor_metrics").upsert({
    advisor_id: advisorId,
    aum: m.aum || {},
    aum_inicio_ano: m.aumInicioAno ?? null,
    comisiones_q: m.comisionesQ ?? null,
    entradas_nuevos_clientes: m.entradasNuevosClientes ?? null,
    entradas_clientes_existentes: m.entradasClientesExistentes ?? null,
    salidas: m.salidas ?? null,
    n_clientes: m.nClientes ?? null,
  });
  if (error) throw new Error(`advisor_metrics: ${error.message}`);
  console.log("advisor_metrics: upserted");
}

console.log(`\nDone. Seeded ${demo.clients.length} demo clients under advisor ${advisorId}.`);
