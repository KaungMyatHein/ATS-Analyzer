"use client";
import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { Provider } from "react-redux";
import { store } from "lib/redux/store";
import { useAppSelector, useSetInitialStore, useSaveStateToLocalStorageOnChange, useAppDispatch } from "lib/redux/hooks";
import { selectResume } from "lib/redux/resumeSlice";
import { selectSettings, changeSettings, DEFAULT_THEME_COLOR, type GeneralSetting } from "lib/redux/settingsSlice";
import { ResumePDF } from "components/Resume/ResumePDF";
import { ResumeIframeCSR } from "components/Resume/ResumeIFrame";
import { NonEnglishFontsCSSLazyLoader } from "components/fonts/NonEnglishFontsCSSLoader";
import { usePDF } from "@react-pdf/renderer";
import { useRegisterReactPDFFont, useRegisterReactPDFHyphenationCallback } from "components/fonts/hooks";
import { deepClone } from "lib/deep-clone";
import { ResumeStyleSelections } from "components/ResumeForm/ThemeForm/ResumeStyleSelections";
import { HeartIcon } from "@heroicons/react/24/outline";
import { HeartIcon as HeartSolid } from "@heroicons/react/24/solid";

const GaugeChartCSR = dynamic(() => import("react-gauge-chart"), { ssr: false });

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
  createdAt?: string;
  status?: string;
  appliedAt?: string;
};

function normalizeResult(entry: SavedJDEntry) {
  const r = entry.result || {};
  if (r && r.matchingExactSkills && r.matchingFlexSkills && r.matchingSkills) {
    return r;
  }
  const flex = r?.flex;
  const phrase = r?.phrase;
  const keywords: string[] = Array.isArray(flex?.keywords) ? flex.keywords : Array.isArray(phrase?.keywords) ? phrase.keywords : [];
  const exact = Array.isArray(phrase?.matchingSkills) ? phrase.matchingSkills : [];
  const flexOnlyBase = Array.isArray(flex?.matchingSkills) ? flex.matchingSkills : [];
  const flexOnly = flexOnlyBase.filter((k: string) => !exact.includes(k));
  const union = Array.from(new Set([...(exact || []), ...(flexOnly || [])]));
  const WEIGHT_PHRASE = 1.0;
  const WEIGHT_FLEX = 0.6;
  let sum = 0;
  for (const k of keywords) {
    if (exact.includes(k)) sum += WEIGHT_PHRASE;
    else if (flexOnlyBase.includes(k)) sum += WEIGHT_FLEX;
  }
  const weightedScore = keywords.length ? Math.round((sum / keywords.length) * 100) : (typeof entry.matchScore === "number" ? entry.matchScore : undefined);
  const missing = Array.isArray(flex?.missingSkills) ? flex.missingSkills : Array.isArray(phrase?.missingSkills) ? phrase.missingSkills : [];
  return {
    keywords,
    matchingSkills: union,
    matchingExactSkills: exact,
    matchingFlexSkills: flexOnly,
    missingSkills: missing,
    matchScore: typeof weightedScore === "number" ? weightedScore : (typeof entry.matchScorePhrase === "number" ? entry.matchScorePhrase : (typeof entry.matchScoreFlex === "number" ? entry.matchScoreFlex : 0)),
    feedback: r?.feedback,
    raw: r?.raw,
  };
}

function PageBody() {
  useSetInitialStore();
  useSaveStateToLocalStorageOnChange();
  const resume = useAppSelector(selectResume);
  const settings = useAppSelector(selectSettings);
  const dispatch = useAppDispatch();
  const [items, setItems] = useState<SavedJDEntry[]>([]);
  const [selected, setSelected] = useState<SavedJDEntry | null>(null);
  const [previewResume, setPreviewResume] = useState(deepClone(resume) as any);
  const [tab, setTab] = useState<"result" | "preview">("result");
  const [selectedMissing, setSelectedMissing] = useState<string[]>([]);
  const [skillStep, setSkillStep] = useState<"skills" | "category" | "confirm">("skills");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [newCategoryName, setNewCategoryName] = useState<string>("");
  const [downloadOpen, setDownloadOpen] = useState(false);
  const [downloadHighlight, setDownloadHighlight] = useState(false);
  const [reanalyzing, setReanalyzing] = useState(false);
  const [recentlyAddedSkills, setRecentlyAddedSkills] = useState<string[]>([]);
  const [needsReanalyze, setNeedsReanalyze] = useState(false);
  const [expSuggestPairs, setExpSuggestPairs] = useState<{ company: string; jobTitle: string; date: string; before: string[]; after: string[] }[]>([]);
  const [expSuggestLoading, setExpSuggestLoading] = useState(false);
  const [expSuggestError, setExpSuggestError] = useState("");
  const [reanalyzeError, setReanalyzeError] = useState("");
  useRegisterReactPDFFont();
  useRegisterReactPDFHyphenationCallback(settings.fontFamily);
  const [baseResumeId, setBaseResumeId] = useState<string | null>(null);
  const [baseResumeName, setBaseResumeName] = useState<string>("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const STATUS_OPTIONS = ["pending", "ready to apply", "applied", "interview", "offer", "rejected", "paused", "no longer available"];
  const [statusFilters, setStatusFilters] = useState<string[]>([]);
  const FOLLOW_UP_DAYS = 14;
  const [followUpOnly, setFollowUpOnly] = useState(false);
  const needsFollowUp = (it: SavedJDEntry) => {
    const s = (it.status || "pending").toLowerCase();
    if (s !== "applied") return false;
    if (!it.appliedAt) return false;
    const appliedTs = Date.parse(it.appliedAt);
    const ageDays = Math.floor((Date.now() - appliedTs) / (24 * 60 * 60 * 1000));
    return Number.isFinite(appliedTs) && ageDays >= FOLLOW_UP_DAYS;
  };
  const filteredItems = useMemo(() => {
    return items.filter((it) => {
      const s = (it.status || "pending").toLowerCase();
      const statusOk = statusFilters.length === 0 ? true : statusFilters.includes(s);
      const followUpOk = followUpOnly ? needsFollowUp(it) : true;
      return statusOk && followUpOk;
    });
  }, [items, statusFilters, followUpOnly]);
  useEffect(() => {
    const total = Math.max(1, Math.ceil(filteredItems.length / pageSize));
    if (page > total) setPage(total);
  }, [filteredItems.length, pageSize, page]);

  const FAVORITES_KEY = "open-resume-saved-job-favorites";
  const [favorites, setFavorites] = useState<Record<string, boolean>>({});
  useEffect(() => {
    try {
      const raw = localStorage.getItem(FAVORITES_KEY);
      if (raw) setFavorites(JSON.parse(raw));
    } catch {}
  }, []);
  const toggleFavorite = (id: string) => {
    setFavorites((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      try {
        localStorage.setItem(FAVORITES_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  const handleSettingsChange = (field: GeneralSetting, value: string) => {
    dispatch(changeSettings({ field, value }));
  };

  const Speedometer = ({ score = 0, size = 220 }: { score?: number; size?: number }) => {
    const clamp = (v: number) => Math.max(0, Math.min(100, Number(v) || 0));
    const s = clamp(score);
    const arcsLength = [0.4, 0.3, 0.3];
    const colors = ["#f87171", "#fbbf24", "#34d399"];
    const labelColor = s < 40 ? colors[0] : s < 70 ? colors[1] : colors[2];
    return (
      <div className="flex flex-col items-center">
        <GaugeChartCSR
          id="ats-score-gauge"
          nrOfLevels={300}
          arcsLength={arcsLength}
          colors={colors}
          percent={s / 100}
          arcPadding={0.02}
          cornerRadius={0}
          textColor="#111827"
          animate={false}
          style={{ width: `${size}px`, maxWidth: `${size}px` }}
          formatTextValue={() => `${Math.round(s)}`}
        />
        <div className="mt-1 flex items-center gap-3 text-xs text-gray-600">
          <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full" style={{ backgroundColor: colors[0] }} />0–39 Bad</span>
          <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full" style={{ backgroundColor: colors[1] }} />40–69 Normal</span>
          <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full" style={{ backgroundColor: colors[2] }} />70–100 Good</span>
        </div>
      </div>
    );
  };

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("/api/ats/saved-jds", { method: "GET" });
        if (!res.ok) return;
        const json = await res.json();
        const list: SavedJDEntry[] = Array.isArray(json.items) ? json.items : [];
        setItems(list);
        setSelected(list[0] || null);
      } catch {}
    };
    load();
  }, []);

  useEffect(() => {
    const init = async () => {
      try {
        const res = await fetch("/api/resumes", { method: "GET" });
        if (!res.ok) return;
        const json = await res.json();
        const list = Array.isArray(json.resumes) ? json.resumes : [];
        const latest = list[0];
        if (latest) {
          setBaseResumeId(latest.id as string);
          setBaseResumeName((latest.name as string) || "Resume");
        }
      } catch {}
    };
    init();
  }, []);

  const result = selected ? normalizeResult(selected) : null;
  useEffect(() => {
    if (selected) {
      const defaultCategory = `JD: ${selected.company} ${selected.position}`.trim();
      setNewCategoryName(defaultCategory);
    }
  }, [selected]);

  useEffect(() => {
    try {
      const jd = selected?.jd || "";
      localStorage.setItem("open-resume-last-jd", jd);
    } catch {}
  }, [selected]);

  useEffect(() => {
    const loadVariantForSelected = async () => {
      try {
        const id = (selected as any)?.variantResumeId as string | undefined;
        if (id) {
          const res = await fetch(`/api/resumes/${id}`, { method: "GET" });
          const json = await res.json();
          if (res.ok && json.resume?.data) {
            try {
              const data = JSON.parse(json.resume.data);
              setPreviewResume(data);
              return;
            } catch {}
          }
        }
      } catch {}
      setPreviewResume(deepClone(resume) as any);
    };
    loadVariantForSelected();
  }, [selected, resume]);

  const downloadDocument = (
    <ResumePDF
      resume={previewResume}
      settings={settings}
      isPDF={true}
      highlightSkills={downloadHighlight ? (Array.isArray(result?.matchingSkills) ? result!.matchingSkills : []) : []}
      highlightExactSkills={downloadHighlight ? (Array.isArray(result?.matchingExactSkills) ? result!.matchingExactSkills : []) : []}
      highlightFlexSkills={downloadHighlight ? (Array.isArray(result?.matchingFlexSkills) ? result!.matchingFlexSkills : []) : []}
    />
  );
  const [pdfInstance, updatePdf] = usePDF({ document: downloadDocument });

  const triggerDownload = async () => {
    await updatePdf();
    const url = pdfInstance.url;
    if (url) {
      const a = document.createElement("a");
      a.href = url;
      const baseName = baseResumeName || (resume.profile.name || "Resume");
      const role = selected?.position || "";
      const company = selected?.company || "";
      const parts = [baseName, role, company].filter((s) => typeof s === "string" && s.trim());
      const raw = parts.length ? parts.join(" ") : baseName;
      const safe = raw
        .replace(/[\/:*?"<>|]/g, "-")
        .replace(/\s+/g, " ")
        .trim();
      a.download = `${safe}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setDownloadOpen(false);
    }
  };

  const reanalyze = async () => {
    if (!selected) return;
    setReanalyzing(true);
    setReanalyzeError("");
    try {
      const resp = await fetch("/api/ats/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jd: selected.jd, resume: previewResume }),
      });
      const data = await resp.json();
      if (resp.ok) {
        const updated = { ...selected, result: data.result, matchScore: data.result?.matchScore };
        setSelected(updated);
        setItems((prev) => prev.map((it) => (
          it.id === selected.id
            ? {
                ...it,
                result: data.result,
                matchScore: typeof data.result?.matchScore === "number" ? Math.round(data.result.matchScore) : it.matchScore,
                matchScoreFlex: typeof data.result?.flex?.matchScore === "number" ? Math.round(data.result.flex.matchScore) : it.matchScoreFlex,
                matchScorePhrase: typeof data.result?.phrase?.matchScore === "number" ? Math.round(data.result.phrase.matchScore) : it.matchScorePhrase,
              }
            : it
        )));
        try {
          const payload: any = {
            id: selected.id,
            result: data.result,
          };
          if (typeof data.result?.matchScore === "number") payload.matchScore = Math.round(data.result.matchScore);
          if (typeof data.result?.flex?.matchScore === "number") payload.matchScoreFlex = Math.round(data.result.flex.matchScore);
          if (typeof data.result?.phrase?.matchScore === "number") payload.matchScorePhrase = Math.round(data.result.phrase.matchScore);
          await fetch("/api/ats/saved-jds", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
        } catch {}
        setNeedsReanalyze(false);
        setRecentlyAddedSkills([]);
        // Auto-refresh experience suggestions to keep them visible and up-to-date
        try { await generateExperienceSuggestions(); } catch {}
      } else {
        const det = typeof (data?.details) === "string" ? data.details : "";
        const msg = (typeof data?.error === "string" && data.error) ? (det ? `${data.error}: ${det}` : data.error) : "Reanalyze failed";
        setReanalyzeError(msg);
        console.error("[ATS Analyze] Request failed", { status: resp.status, error: data?.error, details: data?.details });
      }
    } catch {
      setReanalyzeError("Network error");
      console.error("[ATS Analyze] Network error", { id: selected?.id });
    }
    setReanalyzing(false);
  };

  const generateExperienceSuggestions = async () => {
    if (!selected) return;
    try {
      setExpSuggestError("");
      setExpSuggestLoading(true);
      const exps = Array.isArray((previewResume as any)?.workExperiences) ? (previewResume as any).workExperiences : [];
      const results: { company: string; jobTitle: string; date: string; before: string[]; after: string[] }[] = [];
      const trim = (s: string, n: number) => {
        const t = String(s || "").trim();
        if (t.length <= n) return t;
        const cut = t.slice(0, n);
        const lastSpace = cut.lastIndexOf(" ");
        return (lastSpace > 0 ? cut.slice(0, lastSpace) : cut).trim() + "…";
      };
      const jdTrim = trim(selected.jd || "", 2000);
      for (const exp of exps) {
        const company = exp?.company || "";
        const jobTitle = exp?.jobTitle || "";
        const date = exp?.date || "";
        const before = Array.isArray(exp?.descriptions)
          ? exp.descriptions
              .filter(Boolean)
              .slice(0, 6)
              .map((b: string) => trim(b, 160))
          : [];
        let after: string[] = [];
        try {
          const resp = await fetch("/api/ai/suggest", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              field: "work.descriptions",
              context: { company, jobTitle, date, before, jd: jdTrim, jobDescription: jdTrim },
            }),
          });
          const data = await resp.json();
          if (resp.ok) {
            after = Array.isArray(data?.suggestion?.bullets) ? data.suggestion.bullets.filter(Boolean) : [];
          } else {
            if (resp.status === 400 && typeof data?.error === "string" && data.error.includes("Missing Gemini API key")) {
              setExpSuggestError("Missing Gemini API key");
            } else {
              const det = typeof (data?.details) === "string" ? data.details : "";
              const msg = (typeof data?.error === "string" && data.error) ? (det ? `${data.error}: ${det}` : data.error) : "Suggestion failed";
              setExpSuggestError(msg);
              console.error("[AI Suggest] Request failed", { status: resp.status, error: data?.error, details: data?.details, company, jobTitle });
            }
          }
        } catch {
          setExpSuggestError("Network error");
          console.error("[AI Suggest] Network error", { company, jobTitle });
        }
        results.push({ company, jobTitle, date, before, after });
        await new Promise((r) => setTimeout(r, 250));
      }
      setExpSuggestPairs(results);
    } catch {
      setExpSuggestError("Network error");
    } finally {
      setExpSuggestLoading(false);
    }
  };

  useEffect(() => {
    const exps = Array.isArray((previewResume as any)?.workExperiences) ? (previewResume as any).workExperiences : [];
    if (!exps.length) return;
    setExpSuggestPairs((prev) => {
      if (prev.length) return prev; // keep existing suggestions
      const init = exps.map((exp: any) => ({
        company: exp?.company || "",
        jobTitle: exp?.jobTitle || "",
        date: exp?.date || "",
        before: Array.isArray(exp?.descriptions) ? exp.descriptions.filter(Boolean) : [],
        after: [],
      }));
      return init;
    });
  }, [previewResume]);

  const toggleMissing = (skill: string) => {
    setSelectedMissing((prev) => {
      const set = new Set(prev);
      if (set.has(skill)) set.delete(skill);
      else set.add(skill);
      return Array.from(set);
    });
  };

  const toggleCategory = (name: string) => {
    setSelectedCategories((prev) => {
      const set = new Set(prev);
      if (set.has(name)) set.delete(name);
      else set.add(name);
      return Array.from(set);
    });
  };

  const addNewCategorySelection = () => {
    const name = newCategoryName.trim();
    if (!name) return;
    setSelectedCategories((prev) => Array.from(new Set([...prev, name])));
    setNewCategoryName("");
  };

  const confirmAddToCategories = async () => {
    if (!selectedMissing.length || !selectedCategories.length) return;
    const source = (previewResume as any) || (resume as any);
    const currentCats = Array.isArray(source?.skills?.categories) ? source.skills.categories : [];
    const newCats = [...currentCats];
    for (const catName of selectedCategories) {
      const idx = newCats.findIndex((c) => c.category.toLowerCase().trim() === catName.toLowerCase().trim());
      const baseSkills = idx >= 0 ? newCats[idx].skills : [];
      const merged = Array.from(new Set([...baseSkills, ...selectedMissing]));
      if (idx >= 0) {
        newCats[idx] = { ...newCats[idx], skills: merged };
      } else {
        newCats.push({ category: catName.trim(), skills: merged, highlights: [] });
      }
    }
    const newResume = { ...source, skills: { ...source.skills, categories: newCats } } as any;
    const baseName = baseResumeName || (source?.profile?.name || "Resume");
    const jobName = selected?.position || selected?.company || "";
    const variantName = jobName ? `${baseName} For ${jobName}` : baseName;
    const variantSettings = { ...(settings as any), isBase: false };
    try {
      const existingVariantId = (selected as any)?.variantResumeId as string | undefined;
      if (existingVariantId) {
        const putRes = await fetch(`/api/resumes/${existingVariantId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: variantName, data: newResume, settings: variantSettings }),
        });
        const putJson = await putRes.json();
        if (putRes.ok) {
          setPreviewResume(newResume);
          setRecentlyAddedSkills(selectedMissing);
          setNeedsReanalyze(true);
        }
      } else {
        const createRes = await fetch("/api/resumes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: variantName, data: newResume, settings: variantSettings }),
        });
        const createJson = await createRes.json();
        if (createRes.ok && createJson?.resume?.id) {
          const variantId = createJson.resume.id as string;
          setItems((prev) => prev.map((it) => (it.id === selected!.id ? ({ ...it, variantResumeId: variantId } as any) : it)));
          setSelected((prev) => (prev ? ({ ...prev, variantResumeId: variantId } as any) : prev));
          try {
            const res = await fetch(`/api/resumes/${variantId}`, { method: "GET" });
            const json = await res.json();
            if (res.ok && json.resume?.data) {
              const data = JSON.parse(json.resume.data);
              setPreviewResume(data);
              setRecentlyAddedSkills(selectedMissing);
              setNeedsReanalyze(true);
              
            }
          } catch {}
          try {
            await fetch("/api/ats/saved-jds", {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ id: selected!.id, variantResumeId: variantId }),
            });
          } catch {}
        }
      }
    } catch {}
    setSelectedMissing([]);
    setSelectedCategories([]);
    setSkillStep("skills");
  };

  return (
    <main className="mx-auto max-w-6xl px-5 py-8">
      <h1 className="text-2xl font-semibold text-gray-900">Saved Jobs</h1>
      <div className="mt-6 grid gap-6 md:grid-cols-2">
      <section>
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-gray-600">Filter by status</span>
            <button
              className={(statusFilters.length === 0 ? "bg-blue-600 text-white " : "bg-white text-gray-700 ") + "rounded-md border px-2 py-1 text-xs hover:bg-blue-50"}
              onClick={() => setStatusFilters([])}
            >
              All
            </button>
            {STATUS_OPTIONS.map((s) => {
              const active = statusFilters.includes(s);
              const label = s.toUpperCase();
              return (
                <button
                  key={`f-${s}`}
                  className={(active ? "bg-blue-600 text-white " : "bg-white text-gray-700 ") + "rounded-md border px-2 py-1 text-xs hover:bg-blue-50"}
                  onClick={() => {
                    setPage(1);
                    setStatusFilters((prev) => {
                      const set = new Set(prev);
                      if (set.has(s)) set.delete(s);
                      else set.add(s);
                      return Array.from(set);
                    });
                  }}
                >
                  {label}
                </button>
              );
            })}
            <span className="ml-2 h-4 w-px bg-gray-200" />
            <button
              className={(followUpOnly ? "bg-amber-500 text-white " : "bg-white text-gray-700 ") + "rounded-md border px-2 py-1 text-xs hover:bg-amber-50"}
              onClick={() => {
                setPage(1);
                setFollowUpOnly((v) => !v);
              }}
              title={`Show applied ≥ ${FOLLOW_UP_DAYS} days with no response`}
            >
              Needs follow-up (≥ {FOLLOW_UP_DAYS}d)
            </button>
          </div>
            {items.length === 0 && (
              <div className="rounded-md border border-gray-200 p-4 text-sm text-gray-500">No saved jobs yet</div>
            )}
            {(() => {
              const start = (page - 1) * pageSize;
              const end = start + pageSize;
              const visibleItems = filteredItems.slice(start, end);
              return visibleItems.map((item) => {
                const score = typeof item.matchScore === "number" ? Math.round(item.matchScore) : (typeof item.matchScoreFlex === "number" ? Math.round(item.matchScoreFlex) : 0);
                const status = (item.status || "Pending").toUpperCase();
                const isSelected = selected?.id === item.id;
                return (
                  <div
                    key={item.id}
                    className={(isSelected ? "border-blue-300 " : "border-gray-200 ") + "rounded-md border bg-white p-3 hover:shadow-sm"}
                    onClick={() => setSelected(item)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="text-sm font-semibold text-gray-900">{item.company} — {item.position}</div>
                        <div className="mt-2 text-[11px] font-medium text-gray-600">Status: <span className="inline-block rounded bg-gray-100 px-2 py-0.5 text-gray-800">{status}</span></div>
                      </div>
                      <div className="ml-4 flex items-center gap-2"> 
                        <Speedometer score={Number(score || 0)} size={140} />
                        <button
                          className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-gray-300 hover:bg-gray-50"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleFavorite(item.id);
                          }}
                          aria-pressed={Boolean(favorites[item.id])}
                          title={favorites[item.id] ? "Unfavorite" : "Favorite"}
                        >
                          {favorites[item.id] ? (
                            <HeartSolid className="h-5 w-5 text-red-600" />
                          ) : (
                            <HeartIcon className="h-5 w-5 text-gray-500" />
                          )}
                        </button>
                      </div>
                    </div>
                    <div className="mt-3 flex items-center justify-end gap-2">
                      <div
                        className="flex items-center gap-2"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <label className="text-[11px] text-gray-600">Status</label>
                        <select
                          className="rounded-md border border-gray-300 bg-white px-2 py-1 text-xs text-gray-800"
                          value={(item.status || "Pending").toLowerCase()}
                        onChange={async (e) => {
                          const val = e.target.value;
                          const updated = val;
                          setItems((prev) => prev.map((it) => (it.id === item.id ? ({ ...it, status: updated } as any) : it)));
                          setSelected((prev) => (prev && prev.id === item.id ? ({ ...prev, status: updated } as any) : prev));
                          try {
                            if (updated === "applied") {
                              const key = "open-resume-applied-days";
                              const keyCounts = "open-resume-applied-days-counts";
                              const today = new Date();
                              const y = today.getFullYear();
                              const m = String(today.getMonth() + 1).padStart(2, "0");
                              const d = String(today.getDate()).padStart(2, "0");
                              const t = `${y}-${m}-${d}`;
                              let arr: string[] = [];
                              try {
                                const raw = localStorage.getItem(key);
                                if (raw) arr = JSON.parse(raw) || [];
                              } catch {}
                              if (!arr.includes(t)) {
                                arr.push(t);
                                try { localStorage.setItem(key, JSON.stringify(arr)); } catch {}
                              }
                              try {
                                const rawCounts = localStorage.getItem(keyCounts);
                                const map = rawCounts ? JSON.parse(rawCounts) || {} : {};
                                map[t] = (map[t] || 0) + 1;
                                localStorage.setItem(keyCounts, JSON.stringify(map));
                              } catch {}
                            }
                          } catch {}
                          try {
                            await fetch("/api/ats/saved-jds", {
                              method: "PATCH",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ id: item.id, status: updated }),
                            });
                          } catch {}
                        }}
                        >
                          <option value="pending">Pending</option>
                          <option value="ready to apply">Ready to apply</option>
                          <option value="applied">Applied</option>
                          <option value="interview">Interview</option>
                          <option value="offer">Offer</option>
                          <option value="rejected">Rejected</option>
                          <option value="paused">Paused</option>
                          <option value="no longer available">No longer available</option>
                        </select>
                      </div>
                      {item.link ? (
                        <a
                          href={(item.link || "").startsWith("http") ? (item.link as string) : `https://${item.link}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="rounded-md bg-blue-600 px-3 py-1 text-xs font-medium text-white hover:bg-blue-700"
                          onClick={(e) => e.stopPropagation()}
                        >
                          Apply
                        </a>
                      ) : (
                        <button
                          className="rounded-md bg-blue-600 px-3 py-1 text-xs font-medium text-white opacity-50 cursor-not-allowed"
                          disabled
                        >
                          Apply
                        </button>
                      )}
                      <button
                        className="rounded-md border border-red-300 px-3 py-1 text-xs text-red-700 hover:bg-red-50"
                        onClick={async () => {
                          const ok = window.confirm("Delete this saved job?");
                          if (!ok) return;
                          try {
                            const resp = await fetch(`/api/ats/saved-jds?id=${encodeURIComponent(item.id)}`, { method: "DELETE" });
                            const json = await resp.json();
                            if (resp.ok) {
                              setItems((prev) => prev.filter((it) => it.id !== item.id));
                              if (selected?.id === item.id) {
                                const next = (prev => prev.find((it) => it.id !== item.id) || null)(items);
                                setSelected(next);
                              }
                            }
                          } catch {}
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                );
              });
            })()}
            {filteredItems.length > 0 && (
              <div className="mt-2 flex items-center justify-between">
                <div className="text-xs text-gray-600">
                  {(() => {
                    const start = (page - 1) * pageSize;
                    const end = Math.min(start + pageSize, filteredItems.length);
                    const from = filteredItems.length ? start + 1 : 0;
                    return `Showing ${from}–${end} of ${filteredItems.length}`;
                  })()}
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-xs text-gray-600">Rows per page</label>
                  <select
                    className="rounded-md border border-gray-300 bg-white px-2 py-1 text-xs text-gray-800"
                    value={pageSize}
                    onChange={(e) => {
                      setPage(1);
                      setPageSize(Number(e.target.value));
                    }}
                  >
                    <option value={5}>5</option>
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                  </select>
                  <div className="ml-2 flex items-center gap-2">
                    <button
                      className="rounded-md border border-gray-300 px-2 py-1 text-xs text-gray-700 disabled:opacity-50"
                      onClick={() => setPage(Math.max(1, page - 1))}
                      disabled={page <= 1}
                    >
                      Prev
                    </button>
                    <div className="text-xs text-gray-600">Page {page} of {Math.max(1, Math.ceil(filteredItems.length / pageSize))}</div>
                    <button
                      className="rounded-md border border-gray-300 px-2 py-1 text-xs text-gray-700 disabled:opacity-50"
                      onClick={() => setPage(Math.min(Math.max(1, Math.ceil(filteredItems.length / pageSize)), page + 1))}
                      disabled={page >= Math.max(1, Math.ceil(filteredItems.length / pageSize))}
                    >
                      Next
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>
        <section>
          {!selected && (
            <div className="rounded-md border border-gray-200 p-4 text-sm text-gray-600">Select a job to view</div>
          )}
          {selected && result && (
            <div className="h-[calc(100vh-var(--top-nav-bar-height))] rounded-md border border-gray-200 flex flex-col">
              <div className="flex border-b">
                <button
                  className={"px-4 py-2 text-sm " + (tab === "result" ? "border-b-2 border-blue-600 text-blue-600" : "text-gray-600")}
                  onClick={() => setTab("result")}
                >
                  Result
                </button>
                <button
                  className={"px-4 py-2 text-sm " + (tab === "preview" ? "border-b-2 border-blue-600 text-blue-600" : "text-gray-600")}
                  onClick={() => setTab("preview")}
                >
                  Preview PDF
                </button>
              </div>
              {tab === "result" && (
                <div className="grid gap-4 p-4 flex-1 overflow-auto">
                  <div className="rounded-md border border-gray-200 p-4">
                    <div className="text-sm font-medium text-gray-700">Job</div>
                    <div className="mt-1 text-sm text-gray-800">{selected.company} — {selected.position}</div>
                    <div className="mt-1 text-xs text-gray-500 break-all">{selected.link || "No link"}</div>
                    <div className="mt-2 rounded-md border border-blue-200 bg-blue-50 p-2 text-[11px] text-blue-700">AI suggestions in Work Experiences will use this job description</div>
                  </div>
                  <div className="rounded-md border border-gray-200 p-4">
                    <div className="text-sm font-medium text-gray-700">ATS Score</div>
                    <div className="mt-2">
                      <Speedometer score={Number(result.matchScore || 0)} />
                    </div>
                    <div className="mt-3">
                      <button
                        className="rounded-md bg-blue-600 px-3 py-2 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                        onClick={reanalyze}
                        disabled={reanalyzing}
                      >
                        {reanalyzing ? "Reanalyzing..." : "Reanalyze"}
                      </button>
                    </div>
                    {reanalyzeError && (
                      <div className="mt-2 rounded-md border border-red-300 bg-red-50 p-2 text-xs text-red-800">
                        {reanalyzeError}
                        {reanalyzeError.includes("Gemini API key") && (
                          <span> — <a href="/settings" className="text-blue-700 underline">Add key in Settings</a></span>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="rounded-md border border-gray-200 p-4">
                    <div className="text-sm font-medium text-gray-700">Matched Skills (Exact)</div>
                    <ul className="mt-2 flex flex-wrap gap-2">
                      {(Array.isArray(result.matchingExactSkills) ? result.matchingExactSkills : []).map((skill: string) => {
                        const locs = (result.matchLocations && (result.matchLocations as any)[skill]) || [];
                        const locText = Array.isArray(locs) && locs.length ? ` in ${locs.join(", ")}` : "";
                        return (
                          <li key={`ex-${skill}`} className="inline-flex items-center gap-1">
                            <span className="rounded bg-green-50 px-2 py-1 text-xs text-green-700">{skill}</span>
                            {locText && <span className="text-[10px] text-gray-600">{locText}</span>}
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                  <div className="rounded-md border border-gray-200 p-4">
                    <div className="text-sm font-medium text-gray-700">Matched Skills (Flexible)</div>
                    <ul className="mt-2 flex flex-wrap gap-2">
                      {(Array.isArray(result.matchingFlexSkills) ? result.matchingFlexSkills : []).map((skill: string) => {
                        const locs = (result.matchLocations && (result.matchLocations as any)[skill]) || [];
                        const locText = Array.isArray(locs) && locs.length ? ` in ${locs.join(", ")}` : "";
                        return (
                          <li key={`fl-${skill}`} className="inline-flex items-center gap-1">
                            <span className="rounded bg-yellow-50 px-2 py-1 text-xs text-yellow-700">{skill}</span>
                            {locText && <span className="text-[10px] text-gray-600">{locText}</span>}
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                  <div className="rounded-md border border-gray-200 p-4">
                    <div className="text-sm font-medium text-gray-700">Missing Skills</div>
                    {needsReanalyze && recentlyAddedSkills.length > 0 && (
                      <div className="mt-2 rounded-md border border-green-300 bg-green-50 p-3 text-xs text-green-800">
                        Added {recentlyAddedSkills.length} skills to resume. Please reanalyze.
                        <button
                          className="ml-2 rounded bg-green-600 px-2 py-1 font-medium text-white hover:bg-green-700 disabled:opacity-50"
                          onClick={reanalyze}
                          disabled={reanalyzing}
                        >
                          {reanalyzing ? "Reanalyzing..." : "Reanalyze"}
                        </button>
                      </div>
                    )}
                    {skillStep === "skills" && (
                      <div className="mt-2">
                        {(
                          (Array.isArray(result.missingSkills)
                            ? result.missingSkills
                            : [])
                        ).length === 0 && (
                          <div className="mt-2 rounded-md border border-blue-300 bg-blue-50 p-3 text-xs text-blue-800">
                            No missing skills detected for this job. Great work! Consider tailoring achievements and keywords to further boost your ATS score.
                          </div>
                        )}
                        <ul className="flex flex-wrap gap-2">
                          {(Array.isArray(result.missingSkills) ? result.missingSkills : []).map((skill: string) => {
                            const cats = Array.isArray((previewResume as any)?.skills?.categories) ? (previewResume as any).skills.categories : [];
                            const isAdded = cats.some((c: any) => Array.isArray(c?.skills) && c.skills.includes(skill));
                            if (isAdded) {
                              return (
                                <li key={`mi-${skill}`} className="inline-flex items-center gap-2">
                                  <span className="rounded bg-green-50 px-2 py-1 text-xs text-green-700">{skill}</span>
                                  <span className="text-[10px] font-medium text-green-700">Added</span>
                                </li>
                              );
                            }
                            return (
                              <li key={`mi-${skill}`}>
                                <label className="inline-flex items-center gap-2">
                                  <input
                                    type="checkbox"
                                    className="rounded border-gray-300"
                                    checked={selectedMissing.includes(skill)}
                                    onChange={() => toggleMissing(skill)}
                                  />
                                  <span className="rounded bg-red-50 px-2 py-1 text-xs text-red-700">{skill}</span>
                                </label>
                              </li>
                            );
                          })}
                        </ul>
                        <div className="mt-3 flex items-center gap-2">
                          <button
                            className="rounded-md bg-blue-600 px-3 py-2 text-xs font-medium text-white disabled:opacity-50"
                            onClick={() => setSkillStep("category")}
                            disabled={!selectedMissing.length}
                          >
                            Next
                          </button>
                          <button
                            className="rounded-md bg-gray-200 px-3 py-2 text-xs font-medium text-gray-800"
                            onClick={() => setSelectedMissing([])}
                          >
                            Reset
                          </button>
                        </div>
                        {selectedCategories.length > 0 && (
                          <ul className="mt-2 flex flex-wrap gap-2">
                            {selectedCategories.map((c) => (
                              <li key={`sel-cat-${c}`} className="rounded bg-blue-50 px-2 py-1 text-xs text-blue-700">{c}</li>
                            ))}
                          </ul>
                        )}
                      </div>
                    )}
                    {skillStep === "category" && (
                      <div className="mt-2">
                        <div className="text-xs text-gray-600">Select skill categories</div>
                        <ul className="mt-2 flex flex-wrap gap-2">
                          {(Array.isArray((previewResume as any)?.skills?.categories) ? (previewResume as any).skills.categories : []).map((c: any) => (
                            <li key={`cat-${c.category}`}>
                              <label className="inline-flex items-center gap-2">
                                <input
                                  type="checkbox"
                                  className="rounded border-gray-300"
                                  checked={selectedCategories.includes(c.category)}
                                  onChange={() => toggleCategory(c.category)}
                                />
                                <span className="rounded bg-gray-50 px-2 py-1 text-xs text-gray-700">{c.category}</span>
                              </label>
                            </li>
                          ))}
                        </ul>
                        <div className="mt-3 flex items-center gap-2">
                          <input
                            className="w-full rounded-md border border-gray-300 p-2 text-sm"
                            placeholder="New category name"
                            value={newCategoryName}
                            onChange={(e) => setNewCategoryName(e.target.value)}
                          />
                          <button
                            className="rounded-md bg-gray-800 px-3 py-2 text-xs font-medium text-white disabled:opacity-50"
                            onClick={addNewCategorySelection}
                            disabled={!newCategoryName.trim()}
                          >
                            Add
                          </button>
                        </div>
                        <div className="mt-3 flex items-center gap-2">
                          <button
                            className="rounded-md bg-gray-200 px-3 py-2 text-xs font-medium text-gray-800"
                            onClick={() => setSkillStep("skills")}
                          >
                            Back
                          </button>
                          <button
                            className="rounded-md bg-blue-600 px-3 py-2 text-xs font-medium text-white disabled:opacity-50"
                            onClick={() => setSkillStep("confirm")}
                            disabled={!selectedCategories.length}
                          >
                            Next
                          </button>
                        </div>
                      </div>
                    )}
                    {skillStep === "confirm" && (
                      <div className="mt-2 space-y-3">
                        <div className="text-xs text-gray-600">Confirm adding selected skills to categories</div>
                        <div>
                          <div className="text-xs font-medium text-gray-700">Skills</div>
                          <ul className="mt-1 flex flex-wrap gap-2">
                            {selectedMissing.map((s) => (
                              <li key={`conf-s-${s}`} className="rounded bg-red-50 px-2 py-1 text-xs text-red-700">{s}</li>
                            ))}
                          </ul>
                        </div>
                        <div>
                          <div className="text-xs font-medium text-gray-700">Categories</div>
                          <ul className="mt-1 flex flex-wrap gap-2">
                            {selectedCategories.map((c) => (
                              <li key={`conf-c-${c}`} className="rounded bg-gray-50 px-2 py-1 text-xs text-gray-700">{c}</li>
                            ))}
                          </ul>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            className="rounded-md bg-gray-200 px-3 py-2 text-xs font-medium text-gray-800"
                            onClick={() => setSkillStep("category")}
                          >
                            Back
                          </button>
                          <button
                            className="rounded-md bg-green-600 px-3 py-2 text-xs font-medium text-white"
                            onClick={confirmAddToCategories}
                          >
                            Confirm
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="rounded-md border border-gray-200 p-4">
                    <div className="text-sm font-medium text-gray-700">Suggestions for Resume</div>
                    <p className="mt-2 whitespace-pre-wrap break-words text-sm text-gray-800">{result.feedback || "No suggestions"}</p>
                  </div>
                  <div className="rounded-md border border-gray-200 p-4">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-medium text-gray-700">Experience Suggestions</div>
                      <button
                        className="rounded-md bg-blue-600 px-3 py-1 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                        onClick={generateExperienceSuggestions}
                        disabled={expSuggestLoading}
                      >
                        {expSuggestLoading ? "Generating..." : "Generate"}
                      </button>
                    </div>
                    {expSuggestError && (
                      <div className="mt-2 rounded-md border border-red-300 bg-red-50 p-2 text-xs text-red-800">
                        {expSuggestError}
                        {expSuggestError.includes("Gemini API key") && (
                          <span> — <a href="/settings" className="text-blue-700 underline">Add key in Settings</a></span>
                        )}
                      </div>
                    )}
                    {(!expSuggestPairs.length && !expSuggestLoading && !expSuggestError) && (
                      <div className="mt-2 text-xs text-gray-600">No experience suggestions yet</div>
                    )}
                    {expSuggestPairs.length > 0 && (
                      <div className="mt-2 space-y-3">
                        {expSuggestPairs.map((it, idx) => (
                          <div key={`exp-pair-${idx}`} className="rounded-md border border-gray-200 p-3">
                            <div className="text-sm font-medium text-gray-800">{it.company} — {it.jobTitle}</div>
                            <div className="text-[11px] text-gray-600">{it.date}</div>
                            <div className="mt-2 grid gap-3 md:grid-cols-2">
                              <div>
                                <div className="text-xs font-medium text-gray-700">Before</div>
                                {it.before.length === 0 ? (
                                  <div className="mt-1 text-xs text-gray-500">No bullets</div>
                                ) : (
                                  <ul className="mt-1 list-disc pl-5 text-sm text-gray-800">
                                    {it.before.map((b, i) => (<li key={`exp-bef-${idx}-${i}`}>{b}</li>))}
                                  </ul>
                                )}
                              </div>
                              <div>
                                <div className="text-xs font-medium text-gray-700">After</div>
                                {it.after.length === 0 ? (
                                  <div className="mt-1 text-xs text-gray-500">No suggestions</div>
                                ) : (
                                  <ul className="mt-1 list-disc pl-5 text-sm text-gray-800">
                                    {it.after.map((b, i) => (<li key={`exp-aft-${idx}-${i}`}>{b}</li>))}
                                  </ul>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
              {tab === "preview" && (
                <div className="p-3 flex-1">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div>
                      <div className="text-xs font-medium text-gray-700">Resume Style</div>
                      <ResumeStyleSelections
                        themeColor={settings.themeColor || DEFAULT_THEME_COLOR}
                        selectedStyle={settings.style}
                        handleSettingsChange={handleSettingsChange}
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        className="rounded-md border border-gray-300 px-3 py-1 text-xs hover:bg-gray-100"
                        onClick={() => setDownloadOpen((v) => !v)}
                      >
                        Download
                      </button>
                      {downloadOpen && (
                        <div className="flex items-center gap-2">
                          <label className="inline-flex items-center gap-1 text-xs text-gray-700">
                            <input
                              type="radio"
                              name="download-highlight"
                              className="mt-0.5 h-4 w-4"
                              checked={!downloadHighlight}
                              onChange={() => setDownloadHighlight(false)}
                            />
                            Unhighlighted (default)
                          </label>
                          <label className="inline-flex items-center gap-1 text-xs text-gray-700">
                            <input
                              type="radio"
                              name="download-highlight"
                              className="mt-0.5 h-4 w-4"
                              checked={downloadHighlight}
                              onChange={() => setDownloadHighlight(true)}
                            />
                            Highlighted
                          </label>
                          <button
                            className="rounded-md bg-green-600 px-3 py-1 text-xs font-medium text-white hover:bg-green-700"
                            onClick={triggerDownload}
                          >
                            Confirm
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                  <NonEnglishFontsCSSLazyLoader />
                  <ResumeIframeCSR documentSize={settings.documentSize} scale={0.8} enablePDFViewer={false}>
                  <ResumePDF
                      resume={previewResume}
                      settings={settings}
                      isPDF={false}
                      highlightSkills={Array.isArray(result?.matchingSkills) ? result.matchingSkills : []}
                      highlightExactSkills={Array.isArray(result?.matchingExactSkills) ? result.matchingExactSkills : []}
                      highlightFlexSkills={Array.isArray(result?.matchingFlexSkills) ? result.matchingFlexSkills : []}
                    />
                  </ResumeIframeCSR>
                </div>
              )}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function SavedJobsPage() {
  return (
    <Provider store={store}>
      <PageBody />
    </Provider>
  );
}

export default dynamic(() => Promise.resolve(SavedJobsPage), { ssr: false });
