"use client";
import { useState, useMemo, useEffect } from "react";
import { ResumeIframeCSR } from "components/Resume/ResumeIFrame";
import { ResumePDF } from "components/Resume/ResumePDF";
import {
  ResumeControlBarCSR,
  ResumeControlBarBorder,
} from "components/Resume/ResumeControlBar";
import { FlexboxSpacer } from "components/FlexboxSpacer";
import { useAppSelector } from "lib/redux/hooks";
import { selectResume } from "lib/redux/resumeSlice";
import { selectSettings } from "lib/redux/settingsSlice";
import { DEBUG_RESUME_PDF_FLAG, ENABLE_PDF_VIEWER } from "lib/constants";
import {
  useRegisterReactPDFFont,
  useRegisterReactPDFHyphenationCallback,
} from "components/fonts/hooks";
import { NonEnglishFontsCSSLazyLoader } from "components/fonts/NonEnglishFontsCSSLoader";

export const Resume = () => {
  const [scale, setScale] = useState(0.8);
  const resume = useAppSelector(selectResume);
  const settings = useAppSelector(selectSettings);
  const [highlightSkills, setHighlightSkills] = useState<string[]>([]);
  
  // Load and refresh highlights when the page gains focus
  // and when navigating back from analyzer
  useEffect(() => {
    const load = () => {
      try {
        const raw = localStorage.getItem("ats_matching_skills");
        const arr = raw ? JSON.parse(raw) : [];
        setHighlightSkills(Array.isArray(arr) ? arr.filter(Boolean) : []);
      } catch {
        setHighlightSkills([]);
      }
    };
    load();
    const onVisibility = () => {
      if (document.visibilityState === "visible") load();
    };
    const onAtsUpdate = () => load();
    window.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("ats_matching_skills_updated", onAtsUpdate as EventListener);
    return () => window.removeEventListener("visibilitychange", onVisibility);
  }, []);
  const resumeDocument = useMemo(
    () => <ResumePDF resume={resume} settings={settings} isPDF={true} highlightSkills={highlightSkills} />,
    [resume, settings, highlightSkills]
  );

  useRegisterReactPDFFont();
  useRegisterReactPDFHyphenationCallback(settings.fontFamily);

  return (
    <>
      <NonEnglishFontsCSSLazyLoader />
      <div className="relative flex justify-center md:justify-start">
        <FlexboxSpacer maxWidth={50} className="hidden md:block" />
        <div className="relative">
          <section className="h-[calc(100vh-var(--top-nav-bar-height)-var(--resume-control-bar-height))] overflow-auto md:p-[var(--resume-padding)]">
            <ResumeIframeCSR
              documentSize={settings.documentSize}
              scale={scale}
              enablePDFViewer={ENABLE_PDF_VIEWER}
            >
              <ResumePDF
                resume={resume}
                settings={settings}
                isPDF={ENABLE_PDF_VIEWER}
                highlightSkills={highlightSkills}
              />
            </ResumeIframeCSR>
          </section>
          <ResumeControlBarCSR
            scale={scale}
            setScale={setScale}
            documentSize={settings.documentSize}
            document={resumeDocument}
            fileName={resume.profile.name + " - Resume"}
          />
        </div>
        <ResumeControlBarBorder />
      </div>
    </>
  );
};
