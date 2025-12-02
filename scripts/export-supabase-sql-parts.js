const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

function run(cmd) {
  return execSync(cmd, { encoding: "utf8", maxBuffer: 1024 * 1024 * 256 });
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function buildHeader() {
  return "BEGIN;\n";
}

function buildFooter() {
  return "COMMIT;\n";
}

function exportUsers(outDir) {
  const sql = run(
    "sqlite3 prisma/dev.db \"SELECT 'INSERT INTO public.users (id,email,name,password_hash,gemini_api_key,created_at,updated_at) VALUES ('||quote(id)||','||quote(email)||','||quote(name)||','||quote(password_hash)||','||quote(gemini_api_key)||', to_timestamp('|| (created_at/1000.0) ||'), to_timestamp('|| (updated_at/1000.0) ||') ) ON CONFLICT (id) DO NOTHING;' FROM users;\""
  );
  const out = path.join(outDir, "users.sql");
  fs.writeFileSync(out, buildHeader() + sql + "\n" + buildFooter(), "utf8");
}

function countRows(table) {
  const s = run(`sqlite3 prisma/dev.db "SELECT count(*) FROM ${table};"`);
  return Number(String(s).trim());
}

function exportBatched(table, selectExpr, baseName, batchSize, outDir) {
  const total = countRows(table);
  let offset = 0;
  let part = 1;
  while (offset < total) {
    const sql = run(
      `sqlite3 prisma/dev.db "SELECT ${selectExpr} FROM ${table} LIMIT ${batchSize} OFFSET ${offset};"`
    );
    const fname = `${baseName}_part_${String(part).padStart(3, "0")}.sql`;
    const out = path.join(outDir, fname);
    fs.writeFileSync(out, buildHeader() + sql + "\n" + buildFooter(), "utf8");
    offset += batchSize;
    part += 1;
  }
}

function exportCsvBatched(table, selectColumnsExpr, baseName, batchSize, outDir) {
  const total = countRows(table);
  let offset = 0;
  let part = 1;
  while (offset < total) {
    const csv = run(
      `sqlite3 -csv -header prisma/dev.db "SELECT ${selectColumnsExpr} FROM ${table} LIMIT ${batchSize} OFFSET ${offset};"`
    );
    const fname = `${baseName}_part_${String(part).padStart(3, "0")}.csv`;
    const out = path.join(outDir, fname);
    fs.writeFileSync(out, csv, "utf8");
    offset += batchSize;
    part += 1;
  }
}

function main() {
  const outDir = path.join(process.cwd(), "prisma", "seed_parts");
  ensureDir(outDir);
  exportUsers(outDir);
  exportBatched(
    "resumes",
    "'INSERT INTO public.resumes (id,user_id,name,data,settings,created_at,updated_at) VALUES '||'('||quote(id)||','||quote(user_id)||','||quote(name)||','||quote(data)||','||quote(settings)||','||' to_timestamp('||(created_at/1000.0)||')'||','||' to_timestamp('||(updated_at/1000.0)||')'||')'||' ON CONFLICT (id) DO NOTHING;'",
    "resumes",
    2,
    outDir
  );
  exportBatched(
    "saved_jobs",
    "'INSERT INTO public.saved_jobs (id,user_id,company,position,link,jd,result,match_score,match_score_flex,match_score_phrase,status,applied_at,variant_resume_id,created_at,updated_at) VALUES '||'('||quote(id)||','||quote(user_id)||','||quote(company)||','||quote(position)||','||quote(link)||','||quote(jd)||','||quote(result)||','||COALESCE(CAST(matchScore AS TEXT),'NULL')||','||COALESCE(CAST(matchScoreFlex AS TEXT),'NULL')||','||COALESCE(CAST(matchScorePhrase AS TEXT),'NULL')||','||quote(status)||','||(CASE WHEN applied_at IS NULL OR applied_at='' THEN 'NULL' ELSE ' to_timestamp('||(applied_at/1000.0)||')' END)||','||(CASE WHEN variant_resume_id IS NULL OR variant_resume_id='' THEN 'NULL' ELSE quote(variant_resume_id) END)||','||' to_timestamp('||(created_at/1000.0)||')'||','||' to_timestamp('||(updated_at/1000.0)||')'||')'||' ON CONFLICT (id) DO NOTHING;'",
    "saved_jobs",
    10,
    outDir
  );
  console.log("Wrote parts to:", outDir);

  const csvDir = path.join(process.cwd(), "prisma", "csv_parts");
  ensureDir(csvDir);
  exportCsvBatched(
    "users",
    "id, email, name, password_hash, gemini_api_key, strftime('%Y-%m-%dT%H:%M:%S', created_at/1000.0, 'unixepoch')||'Z' as created_at, strftime('%Y-%m-%dT%H:%M:%S', updated_at/1000.0, 'unixepoch')||'Z' as updated_at",
    "users",
    100,
    csvDir
  );
  exportCsvBatched(
    "resumes",
    "id, user_id, name, data, settings, strftime('%Y-%m-%dT%H:%M:%S', created_at/1000.0, 'unixepoch')||'Z' as created_at, strftime('%Y-%m-%dT%H:%M:%S', updated_at/1000.0, 'unixepoch')||'Z' as updated_at",
    "resumes",
    1,
    csvDir
  );
  exportCsvBatched(
    "saved_jobs",
    "id, user_id, company, position, link, jd, result, matchScore as match_score, matchScoreFlex as match_score_flex, matchScorePhrase as match_score_phrase, status, CASE WHEN applied_at IS NULL OR applied_at='' THEN '' ELSE strftime('%Y-%m-%dT%H:%M:%S', applied_at/1000.0, 'unixepoch')||'Z' END as applied_at, variant_resume_id, strftime('%Y-%m-%dT%H:%M:%S', created_at/1000.0, 'unixepoch')||'Z' as created_at, strftime('%Y-%m-%dT%H:%M:%S', updated_at/1000.0, 'unixepoch')||'Z' as updated_at",
    "saved_jobs",
    100,
    csvDir
  );
  console.log("Wrote CSV parts to:", csvDir);
}

main();
