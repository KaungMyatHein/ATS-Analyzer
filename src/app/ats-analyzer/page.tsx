"use client";
import { useState, useEffect, useRef, useContext, createContext } from "react";
import { Provider } from "react-redux";
import { store } from "lib/redux/store";
import { useAppSelector, useAppDispatch, useSetInitialStore, useSaveStateToLocalStorageOnChange } from "lib/redux/hooks";
import { selectResume, setResume } from "lib/redux/resumeSlice";
import { selectSettings, setSettings } from "lib/redux/settingsSlice";
import { ResumePDF } from "components/Resume/ResumePDF";
import { ResumeIframeCSR } from "components/Resume/ResumeIFrame";
import { ENABLE_PDF_VIEWER } from "lib/constants";
import { NonEnglishFontsCSSLazyLoader } from "components/fonts/NonEnglishFontsCSSLoader";
import {
  useRegisterReactPDFFont,
  useRegisterReactPDFHyphenationCallback,
} from "components/fonts/hooks";

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
};

const SavedJDContext = createContext<{
  list: SavedJDEntry[];
  reload: () => Promise<void>;
}>({ list: [], reload: async () => {} });

function SavedJDProvider({ children }: { children: React.ReactNode }) {
  const [list, setList] = useState<SavedJDEntry[]>([]);

  const reload = async () => {
    try {
      const res = await fetch("/api/ats/saved-jds", { method: "GET" });
      if (!res.ok) return;
      const json = await res.json();
      setList(Array.isArray(json.items) ? json.items : []);
    } catch {}
  };

  useEffect(() => {
    reload();
  }, []);

  return (
    <SavedJDContext.Provider value={{ list, reload }}>
      {children}
    </SavedJDContext.Provider>
  );
}

function SavedJDList({ onSelect }: { onSelect: (entry: SavedJDEntry) => void }) {
  const { list, reload } = useContext(SavedJDContext);
  if (!list.length) {
    return <div className="mt-2 text-xs text-gray-500">No saved JDs yet</div>;
  }
  return (
    <div className="mt-2 divide-y rounded-md border">
      {list.map((item) => (
        <button
          key={item.id}
          className="flex w-full items-center justify-between px-3 py-2 text-left hover:bg-gray-50"
          onClick={() => onSelect(item)}
        >
          <div>
            <div className="text-sm font-medium text-gray-800">{item.company} — {item.position}</div>
            <div className="text-xs text-gray-500 truncate">{item.link || "No link"}</div>
          </div>
          <div className="text-xs text-gray-700">Score: {typeof item.matchScore === "number" ? Math.round(item.matchScore) : (typeof item.matchScoreFlex === "number" ? Math.round(item.matchScoreFlex) : "—")}</div>
        </button>
      ))}
    </div>
  );
}

function SaveJDSection({ jd, result, onSaved }: { jd: string; result: any; onSaved: () => void }) {
  const { reload } = useContext(SavedJDContext);
  const [open, setOpen] = useState(false);
  const [company, setCompany] = useState("");
  const [position, setPosition] = useState("");
  const [link, setLink] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const save = async () => {
    setErr("");
    if (!jd || !result) {
      setErr("Analyze first to get ATS result");
      return;
    }
    if (!company || !position) {
      setErr("Company and position are required");
      return;
    }
    setSaving(true);
    try {
      const resp = await fetch("/api/ats/saved-jds", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ company, position, link, jd, result }),
      });
      const data = await resp.json();
      if (!resp.ok) {
        setErr(data.error || "Failed to save");
      } else {
        setOpen(false);
        setCompany("");
        setPosition("");
        setLink("");
        await reload();
        onSaved();
      }
    } catch {
      setErr("Network error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-md border border-gray-200 p-4">
      <div className="flex items-center justify-between">
        <div className="text-sm font-medium text-gray-700">Save JD</div>
        <button
          className="rounded-md bg-blue-600 px-3 py-1 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          onClick={() => setOpen((v) => !v)}
        >
          {open ? "Close" : "Save JD"}
        </button>
      </div>
      {open && (
        <div className="mt-3 space-y-3">
          <input
            className="w-full rounded-md border border-gray-300 p-2 text-sm"
            placeholder="Company"
            value={company}
            onChange={(e) => setCompany(e.target.value)}
          />
          <input
            className="w-full rounded-md border border-gray-300 p-2 text-sm"
            placeholder="Position"
            value={position}
            onChange={(e) => setPosition(e.target.value)}
          />
          <input
            className="w-full rounded-md border border-gray-300 p-2 text-sm"
            placeholder="Link to JD (optional)"
            value={link}
            onChange={(e) => setLink(e.target.value)}
          />
          {err && <div className="rounded-md bg-red-50 p-2 text-xs text-red-700">{err}</div>}
          <button
            className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
            onClick={save}
            disabled={saving}
          >
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      )}
    </div>
  );
}

function PageBody() {
  useSetInitialStore();
  useSaveStateToLocalStorageOnChange();
  const dispatch = useAppDispatch();
  const resumeIdRef = useRef<string | null>(null);
  const resume = useAppSelector(selectResume);
  const settings = useAppSelector(selectSettings);
  const [jd, setJd] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<any>(null);

  useRegisterReactPDFFont();
  useRegisterReactPDFHyphenationCallback(settings.fontFamily);

  useEffect(() => {
    const init = async () => {
      try {
        const res = await fetch("/api/resumes", { method: "GET" });
        if (!res.ok) return;
        const json = await res.json();
        const list = json.resumes || [];
        if (list.length) {
          const latest = list[0];
          resumeIdRef.current = latest.id as string;
          let serverResume: any = undefined;
          let serverSettings: any = undefined;
          try {
            serverResume = JSON.parse(latest.data);
          } catch {}
          try {
            serverSettings = JSON.parse(latest.settings);
          } catch {}
          if (serverResume) dispatch(setResume(serverResume));
          if (serverSettings) dispatch(setSettings(serverSettings));
        }
      } catch {}
    };
    init();
  }, [dispatch]);

  const analyze = async () => {
    setError("");
    setLoading(true);
    setResult(null);
    try {
      const resp = await fetch("/api/ats/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jd, resume }),
      });
      const data = await resp.json();
      if (!resp.ok) {
        const details = typeof data.details === "string" ? data.details : "";
        setError(details ? `${data.error || "Failed to analyze"}: ${details}` : (data.error || "Failed to analyze"));
      } else {
        setResult(data.result);
        try {
          const arr = Array.isArray(data.result?.matchingSkills) ? data.result.matchingSkills : [];
          localStorage.setItem("ats_matching_skills", JSON.stringify(arr));
          if (typeof window !== "undefined") {
            window.dispatchEvent(new Event("ats_matching_skills_updated"));
          }
        } catch {}
      }
    } catch (e: any) {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="mx-auto max-w-6xl px-5 py-8">
      <h1 className="text-2xl font-semibold text-gray-900">ATS Analyzer</h1>
      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <section>
          <p className="text-sm text-gray-600">Paste job description and analyze your resume.</p>
          <div className="mt-3">
            <textarea
              className="w-full rounded-md border border-gray-300 p-3 text-sm"
              rows={12}
              placeholder="Paste job description..."
              value={jd}
              onChange={(e) => setJd(e.target.value)}
            />
          </div>
          <div className="mt-3 flex items-center gap-3">
            {(() => {
              const hasResume = Boolean(
                (resume?.profile?.name && String(resume.profile.name).trim().length > 0) ||
                  (Array.isArray(resume?.workExperiences) && resume.workExperiences.length > 0) ||
                  (Array.isArray(resume?.educations) && resume.educations.length > 0) ||
                  (Array.isArray(resume?.projects) && resume.projects.length > 0) ||
                  (resume?.skills && (
                    (Array.isArray(resume.skills.featuredSkills) && resume.skills.featuredSkills.length > 0) ||
                    (Array.isArray(resume.skills.descriptions) && resume.skills.descriptions.length > 0)
                  ))
              );
              const chipClass = hasResume
                ? "inline-flex items-center gap-2 rounded-md bg-green-50 px-2.5 py-1 text-xs font-medium text-green-700"
                : "inline-flex items-center gap-2 rounded-md bg-yellow-50 px-2.5 py-1 text-xs font-medium text-yellow-700";
              const dotClass = hasResume ? "h-2 w-2 rounded-full bg-green-500" : "h-2 w-2 rounded-full bg-yellow-500";
              return (
                <span className={chipClass}>
                  <span className={dotClass} />
                  {hasResume ? "Resume Loaded" : "Resume Not Loaded"}
                </span>
              );
            })()}
            <button
              onClick={analyze}
              disabled={loading || !jd}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? "Analyzing..." : "Analyze with Gemini"}
            </button>
          </div>
          {error && (
            <div className="mt-3 rounded-md bg-red-50 p-4 text-sm text-red-800">{error}</div>
          )}

          {result && (
            <div className="mt-6 grid gap-4">
              <div className="rounded-md border border-gray-200 p-4">
                <div className="text-sm font-medium text-gray-700">ATS Score (Weighted)</div>
                <div className="mt-2 text-3xl font-semibold text-gray-900">
                  {typeof result?.matchScore === "number" ? Math.round(result.matchScore) : "—"}
                </div>
                <div className="mt-3 h-2 w-full rounded bg-gray-200">
                  <div
                    className="h-2 rounded bg-green-500"
                    style={{ width: `${Math.min(100, Math.max(0, Number(result?.matchScore || 0)))}%` }}
                  />
                </div>
              </div>
              <div className="rounded-md border border-gray-200 p-4">
                <div className="text-sm font-medium text-gray-700">Matched Skills (Exact)</div>
                <ul className="mt-2 flex flex-wrap gap-2">
                  {(() => {
                    const matching: string[] = Array.isArray(result?.matchingExactSkills) ? result!.matchingExactSkills : [];
                    const unique = Array.from(new Set(matching)).slice(0, 100);
                    return unique.length ? (
                      unique.map((skill) => (
                        <li key={`match-ex-${skill}`} className="rounded bg-green-50 px-2 py-1 text-xs text-green-700">
                          {skill}
                        </li>
                      ))
                    ) : (
                      <li className="text-xs text-gray-500">No matched skills</li>
                    );
                  })()}
                </ul>
              </div>
              <div className="rounded-md border border-gray-200 p-4">
                <div className="text-sm font-medium text-gray-700">Matched Skills (Flexible)</div>
                <ul className="mt-2 flex flex-wrap gap-2">
                  {(() => {
                    const matching: string[] = Array.isArray(result?.matchingFlexSkills) ? result!.matchingFlexSkills : [];
                    const unique = Array.from(new Set(matching)).slice(0, 100);
                    return unique.length ? (
                      unique.map((skill) => (
                        <li key={`match-fl-${skill}`} className="rounded bg-yellow-50 px-2 py-1 text-xs text-yellow-700">
                          {skill}
                        </li>
                      ))
                    ) : (
                      <li className="text-xs text-gray-500">No flexible matches</li>
                    );
                  })()}
                </ul>
              </div>
              <div className="rounded-md border border-gray-200 p-4">
                <div className="text-sm font-medium text-gray-700">Missing Skills</div>
                <ul className="mt-2 flex flex-wrap gap-2">
                  {(() => {
                    const missing: string[] = Array.isArray(result?.missingSkills) ? result!.missingSkills : [];
                    const unique = Array.from(new Set(missing)).slice(0, 100);
                    return unique.length ? (
                      unique.map((skill) => (
                        <li key={`miss-${skill}`} className="rounded bg-red-50 px-2 py-1 text-xs text-red-700">
                          {skill}
                        </li>
                      ))
                    ) : (
                      <li className="text-xs text-gray-500">No missing skills</li>
                    );
                  })()}
                </ul>
              </div>
              <div className="rounded-md border border-gray-200 p-4">
                <div className="text-sm font-medium text-gray-700">Feedback</div>
                <p className="mt-2 text-sm text-gray-800">{result?.feedback || ""}</p>
              </div>
            </div>
          )}

          <div className="mt-6">
            <SaveJDSection jd={jd} result={result} onSaved={() => {}} />
          </div>
        </section>
        <section>
          <div className="h-[calc(100vh-var(--top-nav-bar-height))] rounded-md border border-gray-200 p-3">
            <NonEnglishFontsCSSLazyLoader />
            <ResumeIframeCSR documentSize={settings.documentSize} scale={0.8} enablePDFViewer={true}>
              <ResumePDF
                resume={resume}
                settings={settings}
                isPDF={true}
                highlightSkills={Array.isArray(result?.matchingSkills) ? result.matchingSkills : []}
                highlightExactSkills={Array.isArray(result?.matchingExactSkills) ? result.matchingExactSkills : []}
                highlightFlexSkills={Array.isArray(result?.matchingFlexSkills) ? result.matchingFlexSkills : []}
              />
            </ResumeIframeCSR>
          </div>
        </section>
      </div>
    </main>
  );
}

export default function ATSAnalyzer() {
  return (
    <Provider store={store}>
      <PageBody />
    </Provider>
  );
}
