"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ChartPieIcon, ClipboardDocumentListIcon, DocumentDuplicateIcon, CheckCircleIcon, TrashIcon, FireIcon, TrophyIcon, SparklesIcon } from "@heroicons/react/24/outline";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import CalendarHeatmap from "react-calendar-heatmap";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";

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
  appliedAt?: string;
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
    const statuses = ["pending", "ready to apply", "applied", "interview", "offer", "rejected", "paused", "no longer available"];
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

  const STATUS_ORDER = ["pending", "ready to apply", "applied", "interview", "offer", "rejected", "paused", "no longer available"] as const;
  const STATUS_COLORS: Record<string, string> = {
    pending: "bg-gray-300",
    "ready to apply": "bg-blue-400",
    applied: "bg-emerald-500",
    interview: "bg-violet-500",
    offer: "bg-green-500",
    rejected: "bg-red-500",
    paused: "bg-zinc-400",
    "no longer available": "bg-slate-400",
  };
  const STATUS_HEX: Record<string, string> = {
    pending: "#d1d5db",
    "ready to apply": "#60a5fa",
    applied: "#10b981",
    interview: "#8b5cf6",
    offer: "#22c55e",
    rejected: "#ef4444",
    paused: "#a1a1aa",
    "no longer available": "#94a3b8",
  };

  const recentJobs = useMemo(() => {
    const sorted = [...jobs].sort((a, b) => {
      const ta = a.createdAt ? Date.parse(a.createdAt) : 0;
      const tb = b.createdAt ? Date.parse(b.createdAt) : 0;
      return tb - ta;
    });
    return sorted.slice(0, 6);
  }, [jobs]);

  const FOLLOW_UP_DAYS = 14;
  const followUpJobs = useMemo(() => {
    const now = Date.now();
    return jobs.filter((j) => {
      const s = (j.status || "pending").toLowerCase();
      if (s !== "applied") return false;
      if (!j.appliedAt) return false;
      const t = Date.parse(j.appliedAt);
      if (!Number.isFinite(t)) return false;
      const days = Math.floor((now - t) / (24 * 60 * 60 * 1000));
      return days >= FOLLOW_UP_DAYS;
    }).slice(0, 6);
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
  const GOAL_STORAGE_KEY = "open-resume-dashboard-daily-goals";
  const [savedGoal, setSavedGoal] = useState(10);
  const [appliedGoal, setAppliedGoal] = useState(10);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(GOAL_STORAGE_KEY);
      if (raw) {
        const json = JSON.parse(raw);
        if (typeof json.savedGoal === "number") setSavedGoal(json.savedGoal);
        if (typeof json.appliedGoal === "number") setAppliedGoal(json.appliedGoal);
      }
    } catch {}
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem(GOAL_STORAGE_KEY, JSON.stringify({ savedGoal, appliedGoal }));
    } catch {}
  }, [savedGoal, appliedGoal]);
  const appliedCount = stats.byStatus["applied"] || 0;
  const appliedDaysCountsKey = "open-resume-applied-days-counts";
  const [appliedCounts, setAppliedCounts] = useState<Record<string, number>>({});
  useEffect(() => {
    try {
      const raw = localStorage.getItem(appliedDaysCountsKey);
      if (raw) setAppliedCounts(JSON.parse(raw) || {});
    } catch {}
  }, []);
  const weekMs = 7 * 24 * 60 * 60 * 1000;
  const weeklySavedCount = useMemo(() => {
    const now = Date.now();
    return jobs.filter((j) => {
      const t = j.createdAt ? Date.parse(j.createdAt) : 0;
      return now - t <= weekMs;
    }).length;
  }, [jobs, weekMs]);
  const todayStr = (() => {
    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, "0");
    const d = String(today.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  })();
  const dailySavedCount = useMemo(() => {
    return jobs.filter((j) => {
      const t = j.createdAt ? Date.parse(j.createdAt) : 0;
      const ts = new Date(t);
      const y = ts.getFullYear();
      const m = String(ts.getMonth() + 1).padStart(2, "0");
      const d = String(ts.getDate()).padStart(2, "0");
      const s = `${y}-${m}-${d}`;
      return s === todayStr;
    }).length;
  }, [jobs, todayStr]);
  const appliedDaysKey = "open-resume-applied-days";
  const [appliedDays, setAppliedDays] = useState<string[]>([]);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(appliedDaysKey);
      if (raw) setAppliedDays(JSON.parse(raw) || []);
    } catch {}
  }, []);
  const appliedToday = appliedDays.includes(todayStr);
  const appliedDailyCount = appliedCounts[todayStr] || (appliedToday ? 1 : 0);
  const savedPct = Math.min(100, Math.round(((dailySavedCount || 0) / Math.max(1, savedGoal)) * 100));
  const appliedPct = Math.min(100, Math.round(((appliedDailyCount || 0) / Math.max(1, appliedGoal)) * 100));
  const savedDaysSet = useMemo(() => {
    const set = new Set<string>();
    for (const j of jobs) {
      const t = j.createdAt ? Date.parse(j.createdAt) : 0;
      const ts = new Date(t);
      const y = ts.getFullYear();
      const m = String(ts.getMonth() + 1).padStart(2, "0");
      const d = String(ts.getDate()).padStart(2, "0");
      set.add(`${y}-${m}-${d}`);
    }
    return set;
  }, [jobs]);
  const savedCountsMap = useMemo(() => {
    const map: Record<string, number> = {};
    for (const j of jobs) {
      const t = j.createdAt ? Date.parse(j.createdAt) : 0;
      if (!Number.isFinite(t)) continue;
      const ts = new Date(t);
      const y = ts.getFullYear();
      const m = String(ts.getMonth() + 1).padStart(2, "0");
      const d = String(ts.getDate()).padStart(2, "0");
      const s = `${y}-${m}-${d}`;
      map[s] = (map[s] || 0) + 1;
    }
    return map;
  }, [jobs]);
  const formatDate = (date: Date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  };
  const buildHeatmapValues = (map: Record<string, number>, days: number) => {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - days + 1);
    const vals: { date: string; count: number }[] = [];
    for (let i = 0; i < days; i++) {
      const dt = new Date(start);
      dt.setDate(start.getDate() + i);
      const s = formatDate(dt);
      vals.push({ date: s, count: map[s] || 0 });
    }
    return vals;
  };
  const countForDate = (map: Record<string, number>, date: Date) => {
    return map[formatDate(date)] || 0;
  };
  
  const streak = useMemo(() => {
    let s = 0;
    const now = new Date();
    while (true) {
      const y = now.getFullYear();
      const m = String(now.getMonth() + 1).padStart(2, "0");
      const d = String(now.getDate()).padStart(2, "0");
      const k = `${y}-${m}-${d}`;
      if (savedDaysSet.has(k)) {
        s += 1;
        now.setDate(now.getDate() - 1);
      } else {
        break;
      }
    }
    return s;
  }, [savedDaysSet]);
  const xp = (stats.total || 0) + (appliedCount || 0) * 2;
  const levels = [0, 10, 25, 50, 100, 200];
  const levelIdx = levels.findIndex((t, i) => xp >= t && xp < (levels[i + 1] ?? Infinity));
  const level = Math.max(1, levelIdx + 1);
  const nextThreshold = levels[levelIdx + 1] ?? xp;
  const toNext = Math.max(0, nextThreshold - xp);
  const nextPct = nextThreshold === xp ? 100 : Math.round(((xp - levels[levelIdx]) / Math.max(1, nextThreshold - levels[levelIdx])) * 100);
  const quotes = [
    "Small steps daily create big wins.",
    "Momentum beats motivation. Keep moving.",
    "Every application increases your odds.",
    "Show up today. Future you will thank you.",
  ];
  const [quoteIdx, setQuoteIdx] = useState(0);
  useEffect(() => {
    try {
      const key = "open-resume-quote-idx";
      const raw = localStorage.getItem(key);
      if (raw) setQuoteIdx(Number(raw) || 0);
      const next = (Number(raw) || 0) + 1;
      localStorage.setItem(key, String(next % quotes.length));
    } catch {}
  }, [quotes.length]);
  const goalsAchieved = (dailySavedCount || 0) >= savedGoal && (appliedDailyCount || 0) >= appliedGoal;
  const savedBadges = useMemo(() => {
    const thresholds = [5, 10, 20];
    return thresholds.filter((t) => (stats.total || 0) >= t);
  }, [stats.total]);
  const appliedBadges = useMemo(() => {
    const thresholds = [5, 10];
    return thresholds.filter((t) => (appliedCount || 0) >= t);
  }, [appliedCount]);

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

        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-gray-900">Needs Follow-up (≥ {FOLLOW_UP_DAYS} days)</h2>
              <Link href="/saved-jobs" className="text-sm text-blue-600">View all</Link>
            </div>
            <div className="mt-3 divide-y">
              {followUpJobs.length === 0 && (
                <div className="rounded-md border border-gray-200 p-4 text-sm text-gray-500">No follow-ups needed</div>
              )}
              {followUpJobs.map((j) => (
                <div key={j.id} className="flex items-start justify-between py-3">
                  <div className="flex-1">
                    <div className="text-sm font-medium text-gray-900">{j.company} — {j.position}</div>
                    <div className="mt-1 text-[11px] text-gray-600">Applied {j.appliedAt ? new Date(Date.parse(j.appliedAt)).toLocaleDateString() : ""}</div>
                  </div>
                  <div className="ml-4 text-right">
                    <span className="inline-block rounded bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-800">Follow up</span>
                  </div>
                </div>
              ))}
            </div>
          </section>
          <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <h2 className="text-base font-semibold text-gray-900">Applications by Status</h2>
            <div className="mt-3 grid gap-6 md:grid-cols-2">
              <div className="flex items-center justify-center">
                {(() => {
                  const data = STATUS_ORDER.map((s) => ({ name: s.toUpperCase(), key: s, value: stats.byStatus[s] || 0 }));
                  return (
                    <div className="relative h-64 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={data} dataKey="value" nameKey="name" innerRadius={80} outerRadius={120} stroke="#ffffff" strokeWidth={2} paddingAngle={1}>
                            {data.map((d) => (
                              <Cell key={`cell-${d.key}`} fill={STATUS_HEX[d.key]} />
                            ))}
                          </Pie>
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="absolute left-1/2 top-1/2 h-28 w-28 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white shadow-inner flex items-center justify-center">
                        <div className="text-center">
                          <div className="text-[11px] text-gray-500">Total</div>
                          <div className="text-lg font-semibold text-gray-900">{stats.total}</div>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
              <div className="grid gap-1">
                {STATUS_ORDER.map((s) => {
                  const count = stats.byStatus[s] || 0;
                  const pct = stats.total ? Math.round((count / stats.total) * 100) : 0;
                  return (
                    <div key={`legend-${s}`} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <span className={`inline-block h-2 w-2 rounded-full ${STATUS_COLORS[s]}`} />
                        <span className="text-gray-700">{s.toUpperCase()}</span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-800">
                        <span className="text-xs">{count}</span>
                        <span className="text-xs">{pct}%</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
          <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm lg:col-span-2">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-gray-900">Today's Application Goals</h2>
              <div className="flex items-center gap-2">
                <Link href="/saved-jobs" className="rounded-md border border-gray-300 px-2 py-1 text-xs text-gray-800 hover:bg-gray-100">Open Saved Jobs</Link>
                <Link href="/ats-analyzer" className="rounded-md border border-gray-300 px-2 py-1 text-xs text-gray-800 hover:bg-gray-100">Open ATS Analyzer</Link>
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between">
              <div className="inline-flex items-center gap-2 rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700">
                <FireIcon className="h-4 w-4 text-orange-600" />
                <span>Streak</span>
                <span className="rounded bg-orange-100 px-2 py-0.5 text-orange-800">{streak} days</span>
              </div>
              <div className="inline-flex items-center gap-2 rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700">
                <SparklesIcon className="h-4 w-4 text-violet-600" />
                <span>Level</span>
                <span className="rounded bg-violet-100 px-2 py-0.5 text-violet-800">{level}</span>
                <span className="text-xs text-gray-600">{toNext} XP to next</span>
              </div>
            </div>
            {goalsAchieved && (
              <div className="mt-3 inline-flex items-center gap-2 rounded-md border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                <TrophyIcon className="h-4 w-4" />
                <span>Goals achieved. Great job!</span>
              </div>
            )}
            <div className="mt-3 rounded-md border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800">
              {quotes[quoteIdx % quotes.length]}
            </div>
            <div className="mt-4">
              <div className="flex items-center justify-between text-sm text-gray-700">
                <span>Goals Calendar</span>
                <div className="flex items-center gap-3 text-xs">
                  <span className="inline-flex items-center gap-1"><span className="inline-block h-2 w-2 rounded bg-blue-600" /> Saved</span>
                  <span className="inline-flex items-center gap-1"><span className="inline-block h-2 w-2 rounded bg-emerald-600" /> Applied</span>
                </div>
              </div>
              <div className="mt-3">
                <Calendar
                  showNeighboringMonth={false}
                  tileContent={({ date, view }: any) => {
                    if (view !== "month") return null;
                    const saved = countForDate(savedCountsMap, date);
                    const applied = countForDate(appliedCounts, date);
                    if (!saved && !applied) return null;
                    return (
                      <div className="mt-1 flex gap-1">
                        {saved ? <span className="rounded bg-blue-100 px-1 text-[10px] font-medium text-blue-800">{saved}</span> : null}
                        {applied ? <span className="rounded bg-emerald-100 px-1 text-[10px] font-medium text-emerald-800">{applied}</span> : null}
                      </div>
                    );
                  }}
                  tileClassName={({ date, view }: any) => {
                    if (view !== "month") return undefined;
                    const saved = countForDate(savedCountsMap, date);
                    const applied = countForDate(appliedCounts, date);
                    if (saved >= savedGoal && applied >= appliedGoal) return "goal-both-met";
                    if (saved >= savedGoal) return "goal-saved-met";
                    if (applied >= appliedGoal) return "goal-applied-met";
                    return undefined;
                  }}
                />
              </div>
              <style jsx global>{`
                .react-calendar { width: 100%; border: none; border-radius: 12px; box-shadow: 0 1px 2px rgba(0,0,0,0.04); }
                .react-calendar__tile { border-radius: 8px; padding: 6px 4px; }
                .react-calendar__tile--now { outline: 2px solid #c7d2fe; }
                .react-calendar__navigation button { border-radius: 8px; }
                .goal-saved-met { background: #eff6ff; }
                .goal-applied-met { background: #ecfdf5; }
                .goal-both-met { background: linear-gradient(90deg, #eff6ff 0%, #ecfdf5 100%); }
              `}</style>
              <div className="mt-3 grid gap-4 md:grid-cols-2">
                <div className="flex items-center gap-2">
                  <label className="text-xs text-gray-600">Saved target</label>
                  <input
                    type="number"
                    min={1}
                    value={savedGoal}
                    onChange={(e) => setSavedGoal(Math.max(1, Number(e.target.value) || 1))}
                    className="w-20 rounded-md border border-gray-300 px-2 py-1 text-xs"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-xs text-gray-600">Applied target</label>
                  <input
                    type="number"
                    min={1}
                    value={appliedGoal}
                    onChange={(e) => setAppliedGoal(Math.max(1, Number(e.target.value) || 1))}
                    className="w-20 rounded-md border border-gray-300 px-2 py-1 text-xs"
                  />
                </div>
              </div>
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
