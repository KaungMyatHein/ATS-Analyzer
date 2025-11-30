import { Form, FormSection } from "components/ResumeForm/Form";
import {
  Input,
  BulletListTextarea,
} from "components/ResumeForm/Form/InputGroup";
import type { CreateHandleChangeArgsWithDescriptions } from "components/ResumeForm/types";
import { AISuggestIconButton } from "components/ResumeForm/Form/IconButton";
import { useAppDispatch, useAppSelector } from "lib/redux/hooks";
import { selectProjects, changeProjects, selectResume } from "lib/redux/resumeSlice";
import type { ResumeProject } from "lib/redux/types";
import { useState } from "react";

export const ProjectsForm = () => {
  const projects = useAppSelector(selectProjects);
  const dispatch = useAppDispatch();
  const fullResume = useAppSelector(selectResume);
  const [suggestLoadingIdx, setSuggestLoadingIdx] = useState<number | null>(null);
  const [suggestErrorIdx, setSuggestErrorIdx] = useState<{ [k: number]: string }>({});
  const showDelete = projects.length > 1;

  return (
    <Form form="projects" addButtonText="Add Project">
      {projects.map(({ project, date, descriptions }, idx) => {
        const handleProjectChange = (
          ...[
            field,
            value,
          ]: CreateHandleChangeArgsWithDescriptions<ResumeProject>
        ) => {
          dispatch(changeProjects({ idx, field, value } as any));
        };
        const showMoveUp = idx !== 0;
        const showMoveDown = idx !== projects.length - 1;

        return (
          <FormSection
            key={idx}
            form="projects"
            idx={idx}
            showMoveUp={showMoveUp}
            showMoveDown={showMoveDown}
            showDelete={showDelete}
            deleteButtonTooltipText={"Delete project"}
          >
            <Input
              name="project"
              label="Project Name"
              placeholder="OpenResume"
              value={project}
              onChange={handleProjectChange}
              labelClassName="col-span-4"
            />
            <Input
              name="date"
              label="Date"
              placeholder="Winter 2022"
              value={date}
              onChange={handleProjectChange}
              labelClassName="col-span-2"
            />
            <div className="relative col-span-full">
              <BulletListTextarea
                name="descriptions"
                label="Description"
                placeholder="Bullet points"
                value={descriptions}
                onChange={handleProjectChange}
                labelClassName="col-span-full"
              />
              <div className="absolute left-[9.3rem] top-[0.07rem]">
                <AISuggestIconButton
                  tooltipText={suggestLoadingIdx === idx ? "Generating..." : (suggestErrorIdx[idx] || "AI Suggest")}
                  onClick={async () => {
                    try {
                      setSuggestErrorIdx((m) => ({ ...m, [idx]: "" }));
                      setSuggestLoadingIdx(idx);
                      const resp = await fetch("/api/ai/suggest", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          field: "project.descriptions",
                          context: { project, date },
                          resume: fullResume,
                        }),
                      });
                      const data = await resp.json();
                      if (!resp.ok) {
                        const msg = data?.error || "Suggestion failed";
                        setSuggestErrorIdx((m) => ({ ...m, [idx]: msg }));
                      } else {
                        const bullets = Array.isArray(data?.suggestion?.bullets)
                          ? data.suggestion.bullets.filter(Boolean)
                          : [];
                        if (bullets.length) {
                          handleProjectChange("descriptions", bullets as any);
                        }
                      }
                    } catch {
                      setSuggestErrorIdx((m) => ({ ...m, [idx]: "Network error" }));
                    } finally {
                      setSuggestLoadingIdx(null);
                    }
                  }}
                />
              </div>
              {suggestErrorIdx[idx] && (
                <div className="absolute left-[12rem] top-[0.1rem] text-xs text-red-600">{suggestErrorIdx[idx]}</div>
              )}
            </div>
          </FormSection>
        );
      })}
    </Form>
  );
};
