"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ChartPieIcon, ClipboardDocumentListIcon, DocumentDuplicateIcon, CheckCircleIcon, TrashIcon } from "@heroicons/react/24/outline";

type SavedJDEntry = {
  id: string;
  company: string;
  position: string;
  link?: string;
  jd: string;
  result?: any;
  matchScore?: number;
  matchScoreFlex?: number;
  matchScorePhrase?: number;
  status?: string;
  createdAt?: string;
  variantResumeId?: string;
};

type ResumeListItem = {
  id: string;
  name: string;
};

export default function DashboardPage() {
  const [jobs, setJobs] = useState<SavedJDEntry[]>([]);
  const [resumes, setResumes] = useState<ResumeListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showResumes, setShowResumes] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const [jobsRes, resumesRes] = await Promise.all([
          fetch("/api/ats/saved-jds", { method: "GET" }),
          fetch("/api/resumes", { method: "GET" }),
        ]);
        if (jobsRes.ok) {
          const json = await jobsRes.json();
          const list: SavedJDEntry[] = Array.isArray(json.items) ? json.items : [];
          setJobs(list);
        }
        if (resumesRes.ok) {
          const json = await resumesRes.json();
          const list = Array.isArray(json.resumes) ? json.resumes : [];
          const mapped: ResumeListItem[] = list.map((r: any) => ({ id: r.id, name: r.name }));
          setResumes(mapped);
        }
      } catch {}
      setLoading(false);
    };
    load();
  }, []);

  const stats = useMemo(() => {
    const total = jobs.length;
    const statuses = ["pending", "applied", "interview", "offer", "rejected", "paused"];
    const byStatus: Record<string, number> = {};
    for (const s of statuses) byStatus[s] = 0;
    for (const j of jobs) {
      const s = (j.status || "pending").toLowerCase();
      byStatus[s] = (byStatus[s] || 0) + 1;
    }
    const scores: number[] = jobs
      .map((j) => {
        if (typeof j.matchScore === "number") return j.matchScore;
        if (typeof j.matchScoreFlex === "number") return j.matchScoreFlex;
        if (typeof j.matchScorePhrase === "number") return j.matchScorePhrase;
        return NaN;
      })
      .filter((n) => Number.isFinite(n));
    const avgScore = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
    const appliedRate = total ? Math.round(((byStatus["applied"] || 0) / total) * 100) : 0;
    return { total, byStatus, avgScore, appliedRate };
  }, [jobs]);

  const recentJobs = useMemo(() => {
    const sorted = [...jobs].sort((a, b) => {
      const ta = a.createdAt ? Date.parse(a.createdAt) : 0;
      const tb = b.createdAt ? Date.parse(b.createdAt) : 0;
      return tb - ta;
    });
    return sorted.slice(0, 6);
  }, [jobs]);

  const jobTagsByResume = useMemo(() => {
    const map = new Map<string, { company: string; position: string }[]>();
    for (const j of jobs) {
      const rid = j.variantResumeId;
      if (!rid) continue;
      if (!map.has(rid)) map.set(rid, []);
      map.get(rid)!.push({ company: j.company, position: j.position });
    }
    return map;
  }, [jobs]);

  const baseResumeId = useMemo(() => {
    for (const r of resumes) {
      if (!jobTagsByResume.has(r.id)) return r.id;
    }
    return resumes[0]?.id || null;
  }, [resumes, jobTagsByResume]);

  return (
    <main className="min-h-[calc(100vh-var(--top-nav-bar-height))] bg-gradient-to-b from-gray-50 to-white">
      <div className="mx-auto max-w-7xl px-6 py-8">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
            <p className="mt-1 text-sm text-gray-600">Track your application journey at a glance.</p>
          </div>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50">
                <ClipboardDocumentListIcon className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <div className="text-xs text-gray-500">Saved Jobs</div>
                <div className="mt-0.5 text-2xl font-semibold text-gray-900">{stats.total}</div>
              </div>
            </div>
          </div>
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-50">
                <ChartPieIcon className="h-5 w-5 text-violet-600" />
              </div>
              <div>
                <div className="text-xs text-gray-500">Avg ATS Score</div>
                <div className="mt-0.5 text-2xl font-semibold text-gray-900">{stats.avgScore}</div>
              </div>
            </div>
          </div>
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50">
                <CheckCircleIcon className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <div className="text-xs text-gray-500">Applied Rate</div>
                <div className="mt-0.5 text-2xl font-semibold text-gray-900">{stats.appliedRate}%</div>
              </div>
            </div>
          </div>
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-50">
                <DocumentDuplicateIcon className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <div className="text-xs text-gray-500">Resumes</div>
                <div className="mt-0.5 text-2xl font-semibold text-gray-900">{resumes.length}</div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-3">
          <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm lg:col-span-2">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-gray-900">Recent Saved Jobs</h2>
              <Link href="/saved-jobs" className="text-sm text-blue-600">View all</Link>
            </div>
            <div className="mt-3 divide-y">
              {recentJobs.length === 0 && (
                <div className="rounded-md border border-gray-200 p-4 text-sm text-gray-500">No saved jobs yet</div>
              )}
              {recentJobs.map((j) => {
                const score = typeof j.matchScore === "number" ? Math.round(j.matchScore) : (typeof j.matchScoreFlex === "number" ? Math.round(j.matchScoreFlex) : (typeof j.matchScorePhrase === "number" ? Math.round(j.matchScorePhrase) : 0));
                const status = (j.status || "pending").toUpperCase();
                const scoreColor = score < 40 ? "bg-red-100 text-red-800" : score < 70 ? "bg-yellow-100 text-yellow-800" : "bg-green-100 text-green-800";
                return (
                  <div key={j.id} className="flex items-start justify-between py-3">
                    <div className="flex-1">
                      <div className="text-sm font-medium text-gray-900">{j.company} — {j.position}</div>
                      <div className="mt-0.5 text-xs text-gray-600">{j.link || "No link"}</div>
                      <div className="mt-1 flex items-center gap-2">
                        <span className="inline-block rounded bg-gray-100 px-2 py-0.5 text-[11px] text-gray-800">{status}</span>
                      </div>
                    </div>
                    <div className="ml-4 text-right">
                      <span className={`inline-block rounded px-2 py-0.5 text-sm font-semibold ${scoreColor}`}>{score}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
          <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <h2 className="text-base font-semibold text-gray-900">Status Breakdown</h2>
            <div className="mt-3 space-y-3">
              {Object.entries(stats.byStatus).map(([k, v]) => {
                const total = stats.total || 1;
                const pct = Math.round((v / total) * 100);
                return (
                  <div key={k}>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-700">{k.toUpperCase()}</span>
                      <span className="text-gray-900 font-semibold">{v}</span>
                    </div>
                    <div className="mt-1 h-2 w-full rounded bg-gray-100">
                      <div className="h-2 rounded bg-blue-600" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </div>

        <section className="mt-8 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-gray-900">Resumes</h2>
            <button
              className="rounded-md border border-gray-300 px-3 py-1 text-sm text-gray-800 hover:bg-gray-100"
              onClick={() => setShowResumes((v) => !v)}
            >
              {showResumes ? "Hide Detail" : "Show Detail"}
            </button>
          </div>
          {showResumes && (
            <div className="mt-3 divide-y">
              {resumes.length === 0 && (
                <div className="rounded-md border border-gray-200 p-4 text-sm text-gray-500">No resumes found</div>
              )}
              {resumes.map((r) => {
                const tags = jobTagsByResume.get(r.id) || [];
                const isBase = baseResumeId === r.id;
                return (
                  <div key={r.id} className="flex items-center justify-between py-2">
                    <div>
                      <div className="text-sm text-gray-900">{r.name}</div>
                      <div className="mt-1 flex flex-wrap gap-2">
                        {isBase && (
                          <span className="inline-block rounded bg-blue-100 px-2 py-0.5 text-[11px] font-medium text-blue-800">Base</span>
                        )}
                        {tags.map((t, i) => (
                          <span key={i} className="inline-block rounded bg-gray-100 px-2 py-0.5 text-[11px] text-gray-800">
                            For: {t.company} — {t.position}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Link href="/resume-builder" className="rounded-md border border-gray-300 px-2 py-1 text-xs text-gray-800 hover:bg-gray-100">Open</Link>
                      {tags.length === 0 && !isBase && (
                        <button
                          className="inline-flex items-center gap-1 rounded-md border border-red-300 px-2 py-1 text-xs text-red-700 hover:bg-red-50"
                          onClick={async () => {
                            const ok = window.confirm("Delete this resume?");
                            if (!ok) return;
                            try {
                              const res = await fetch(`/api/resumes/${r.id}`, { method: "DELETE" });
                              const json = await res.json();
                              if (res.ok) {
                                setResumes((prev) => prev.filter((it) => it.id !== r.id));
                              }
                            } catch {}
                          }}
                        >
                          <TrashIcon className="h-4 w-4" />
                          Delete
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {loading && (
          <div className="mt-6 text-sm text-gray-500">Loading dashboard…</div>
        )}
      </div>
    </main>
  );
}
