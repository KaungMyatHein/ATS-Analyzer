// Export data from local SQLite dev.db into a Postgres-compatible SQL seed file for Supabase
// Usage: node scripts/export-supabase-sql.js

const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

function run(cmd) {
  return execSync(cmd, { encoding: "utf8" });
}

function header() {
  return `-- Supabase seed SQL generated from prisma/dev.db\n` +
    `BEGIN;\n\n` +
    `-- Tables\n` +
    `CREATE TABLE IF NOT EXISTS public.users (\n` +
    `  id uuid PRIMARY KEY,\n` +
    `  email text UNIQUE NOT NULL,\n` +
    `  name text,\n` +
    `  password_hash text NOT NULL,\n` +
    `  gemini_api_key text,\n` +
    `  created_at timestamptz NOT NULL DEFAULT now(),\n` +
    `  updated_at timestamptz NOT NULL DEFAULT now()\n` +
    `);\n\n` +
    `CREATE TABLE IF NOT EXISTS public.resumes (\n` +
    `  id uuid PRIMARY KEY,\n` +
    `  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,\n` +
    `  name text NOT NULL DEFAULT 'Untitled Resume',\n` +
    `  data text NOT NULL DEFAULT '{}',\n` +
    `  settings text NOT NULL DEFAULT '{}',\n` +
    `  created_at timestamptz NOT NULL DEFAULT now(),\n` +
    `  updated_at timestamptz NOT NULL DEFAULT now()\n` +
    `);\n` +
    `CREATE INDEX IF NOT EXISTS idx_resumes_user_id ON public.resumes(user_id);\n\n` +
    `CREATE TABLE IF NOT EXISTS public.saved_jobs (\n` +
    `  id uuid PRIMARY KEY,\n` +
    `  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,\n` +
    `  company text NOT NULL,\n` +
    `  position text NOT NULL,\n` +
    `  link text,\n` +
    `  jd text NOT NULL,\n` +
    `  result text NOT NULL DEFAULT '{}',\n` +
    `  match_score integer,\n` +
    `  match_score_flex integer,\n` +
    `  match_score_phrase integer,\n` +
    `  status text NOT NULL DEFAULT 'pending',\n` +
    `  applied_at timestamptz,\n` +
    `  variant_resume_id uuid REFERENCES public.resumes(id),\n` +
    `  created_at timestamptz NOT NULL DEFAULT now(),\n` +
    `  updated_at timestamptz NOT NULL DEFAULT now()\n` +
    `);\n` +
    `CREATE INDEX IF NOT EXISTS idx_saved_jobs_user_id ON public.saved_jobs(user_id);\n\n`;
}

function buildInserts() {
  const usersSQL = run(
    `sqlite3 prisma/dev.db "SELECT 'INSERT INTO public.users (id,email,name,password_hash,gemini_api_key,created_at,updated_at) VALUES ('||quote(id)||','||quote(email)||','||quote(name)||','||quote(password_hash)||','||quote(gemini_api_key)||', to_timestamp('|| (created_at/1000.0) ||'), to_timestamp('|| (updated_at/1000.0) ||') ) ON CONFLICT (id) DO NOTHING;' FROM users;"`
  );

  const resumesSQL = run(
    `sqlite3 prisma/dev.db "SELECT 'INSERT INTO public.resumes (id,user_id,name,data,settings,created_at,updated_at) VALUES ('||quote(id)||','||quote(user_id)||','||quote(name)||','||quote(data)||','||quote(settings)||', to_timestamp('|| (created_at/1000.0) ||'), to_timestamp('|| (updated_at/1000.0) ||') ) ON CONFLICT (id) DO NOTHING;' FROM resumes;"`
  );

  const savedJobsSQL = run(
    `sqlite3 prisma/dev.db "SELECT 'INSERT INTO public.saved_jobs (id,user_id,company,position,link,jd,result,match_score,match_score_flex,match_score_phrase,status,applied_at,variant_resume_id,created_at,updated_at) VALUES ('||quote(id)||','||quote(user_id)||','||quote(company)||','||quote(position)||','||quote(link)||','||quote(jd)||','||quote(result)||','||COALESCE(CAST(matchScore AS TEXT),'NULL')||','||COALESCE(CAST(matchScoreFlex AS TEXT),'NULL')||','||COALESCE(CAST(matchScorePhrase AS TEXT),'NULL')||','||quote(status)||','||CASE WHEN applied_at IS NULL OR applied_at='' THEN 'NULL' ELSE 'to_timestamp('||(applied_at/1000.0)||')' END||','||CASE WHEN variant_resume_id IS NULL OR variant_resume_id='' THEN 'NULL' ELSE quote(variant_resume_id) END||', to_timestamp('||(created_at/1000.0)||'), to_timestamp('||(updated_at/1000.0)||') ) ON CONFLICT (id) DO NOTHING;' FROM saved_jobs;"`
  );

  return [usersSQL, resumesSQL, savedJobsSQL].join("\n") + "\nCOMMIT;\n";
}

function main() {
  const outPath = path.join(process.cwd(), "prisma", "supabase_seed.sql");
  const sql = header() + buildInserts();
  fs.writeFileSync(outPath, sql, "utf8");
  console.log("Wrote:", outPath);
}

main();

