"use client";
import { useState, useEffect, useRef } from "react";
import {
  useAppSelector,
  useSaveStateToLocalStorageOnChange,
  useSetInitialStore,
} from "lib/redux/hooks";
import { ShowForm, selectFormsOrder, initialSettings } from "lib/redux/settingsSlice";
import { selectResume, setResume, initialResumeState } from "lib/redux/resumeSlice";
import { selectSettings, setSettings } from "lib/redux/settingsSlice";
import { useAppDispatch } from "lib/redux/hooks";
import { useSession } from "next-auth/react";
import { ProfileForm } from "components/ResumeForm/ProfileForm";
import { WorkExperiencesForm } from "components/ResumeForm/WorkExperiencesForm";
import { EducationsForm } from "components/ResumeForm/EducationsForm";
import { ProjectsForm } from "components/ResumeForm/ProjectsForm";
import { SkillsForm } from "components/ResumeForm/SkillsForm";
import { ThemeForm } from "components/ResumeForm/ThemeForm";
import { CustomForm } from "components/ResumeForm/CustomForm";
import { FlexboxSpacer } from "components/FlexboxSpacer";
import { cx } from "lib/cx";

const formTypeToComponent: { [type in ShowForm]: () => JSX.Element } = {
  workExperiences: WorkExperiencesForm,
  educations: EducationsForm,
  projects: ProjectsForm,
  skills: SkillsForm,
  custom: CustomForm,
};

export const ResumeForm = () => {
  useSaveStateToLocalStorageOnChange();

  const dispatch = useAppDispatch();
  const resume = useAppSelector(selectResume);
  const settings = useAppSelector(selectSettings);
  const { data: session, status } = useSession();
  const resumeIdRef = useRef<string | null>(null);
  const saveTimeoutRef = useRef<any>(null);

  useEffect(() => {
    const init = async () => {
      try {
        const res = await fetch("/api/resumes", { method: "GET" });
        if (!res.ok) return;
        const json = await res.json();
        const list = json.resumes || [];
        if (!list.length) {
          try {
            dispatch(setResume(initialResumeState));
            dispatch(setSettings(initialSettings));
            localStorage.removeItem("open-resume-state");
          } catch {}
          const createRes = await fetch("/api/resumes", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: resume.profile.name || "Untitled Resume",
              data: resume,
              settings: { ...(settings as any), isBase: true },
            }),
          });
          const createJson = await createRes.json();
          if (createRes.ok && createJson.resume) {
            resumeIdRef.current = createJson.resume.id as string;
            console.log("[Client] Created new resume id:", resumeIdRef.current);
          }
        } else {
          const parse = (s: string) => {
            try {
              return JSON.parse(s);
            } catch {
              return {};
            }
          };
          const withSettings = list.map((r: any) => ({ r, s: parse(r.settings) }));
          const base = withSettings.find((x: { r: any; s: any }) => x.s && x.s.isBase === true)?.r;
          const chosen = base || withSettings[withSettings.length - 1]?.r || list[0];
          resumeIdRef.current = chosen.id as string;
          console.log("[Client] Loaded base resume id:", resumeIdRef.current);
          let serverResume: any = undefined;
          let serverSettings: any = undefined;
          try {
            serverResume = JSON.parse(chosen.data);
          } catch {}
          try {
            serverSettings = JSON.parse(chosen.settings);
          } catch {}
          if (serverResume) dispatch(setResume(serverResume));
          if (serverSettings) dispatch(setSettings(serverSettings));
        }
      } catch {}
    };
    init();
  }, []);

  useEffect(() => {
    if (!resumeIdRef.current) return;
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(async () => {
      try {
        await fetch(`/api/resumes/${resumeIdRef.current}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: resume.profile.name || "Untitled Resume",
            data: resume,
            settings,
          }),
        });
        console.log("[Client] Autosaved resume id:", resumeIdRef.current);
      } catch {}
    }, 800);
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [resume, settings]);

  const formsOrder = useAppSelector(selectFormsOrder);
  const [isHover, setIsHover] = useState(false);

  return (
    <div
      className={cx(
        "flex justify-center scrollbar-thin scrollbar-track-gray-100 md:h-[calc(100vh-var(--top-nav-bar-height))] md:justify-end md:overflow-y-scroll",
        isHover ? "scrollbar-thumb-gray-200" : "scrollbar-thumb-gray-100"
      )}
      onMouseOver={() => setIsHover(true)}
      onMouseLeave={() => setIsHover(false)}
    >
      <section className="flex max-w-2xl flex-col gap-8 p-[var(--resume-padding)]">
        <ProfileForm />
        {formsOrder.map((form) => {
          const Component = formTypeToComponent[form];
          return <Component key={form} />;
        })}
        <ThemeForm />
        <br />
      </section>
      <FlexboxSpacer maxWidth={50} className="hidden md:block" />
    </div>
  );
};
