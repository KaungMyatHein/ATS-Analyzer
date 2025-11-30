import { Form, FormSection } from "components/ResumeForm/Form";
import {
  Input,
  BulletListTextarea,
} from "components/ResumeForm/Form/InputGroup";
import { AISuggestIconButton } from "components/ResumeForm/Form/IconButton";
import type { CreateHandleChangeArgsWithDescriptions } from "components/ResumeForm/types";
import { useAppDispatch, useAppSelector } from "lib/redux/hooks";
import {
  changeWorkExperiences,
  selectWorkExperiences,
} from "lib/redux/resumeSlice";
import { selectResume } from "lib/redux/resumeSlice";
import type { ResumeWorkExperience } from "lib/redux/types";
import { useState } from "react";

export const WorkExperiencesForm = () => {
  const workExperiences = useAppSelector(selectWorkExperiences);
  const dispatch = useAppDispatch();
  const fullResume = useAppSelector(selectResume);
  const [suggestLoadingIdx, setSuggestLoadingIdx] = useState<number | null>(null);
  const [suggestErrorIdx, setSuggestErrorIdx] = useState<{ [k: number]: string }>({});

  const showDelete = workExperiences.length > 1;

  return (
    <Form form="workExperiences" addButtonText="Add Job">
      {workExperiences.map(({ company, jobTitle, date, descriptions }, idx) => {
        const handleWorkExperienceChange = (
          ...[
            field,
            value,
          ]: CreateHandleChangeArgsWithDescriptions<ResumeWorkExperience>
        ) => {
          // TS doesn't support passing union type to single call signature
          // https://github.com/microsoft/TypeScript/issues/54027
          // any is used here as a workaround
          dispatch(changeWorkExperiences({ idx, field, value } as any));
        };
        const showMoveUp = idx !== 0;
        const showMoveDown = idx !== workExperiences.length - 1;

        return (
          <FormSection
            key={idx}
            form="workExperiences"
            idx={idx}
            showMoveUp={showMoveUp}
            showMoveDown={showMoveDown}
            showDelete={showDelete}
            deleteButtonTooltipText="Delete job"
          >
            <Input
              label="Company"
              labelClassName="col-span-full"
              name="company"
              placeholder="Khan Academy"
              value={company}
              onChange={handleWorkExperienceChange}
            />
            <Input
              label="Job Title"
              labelClassName="col-span-4"
              name="jobTitle"
              placeholder="Software Engineer"
              value={jobTitle}
              onChange={handleWorkExperienceChange}
            />
            <Input
              label="Date"
              labelClassName="col-span-2"
              name="date"
              placeholder="Jun 2022 - Present"
              value={date}
              onChange={handleWorkExperienceChange}
            />
            <div className="relative col-span-full">
              <BulletListTextarea
                label="Description"
                labelClassName="col-span-full"
                name="descriptions"
                placeholder="Bullet points"
                value={descriptions}
                onChange={handleWorkExperienceChange}
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
                          field: "work.descriptions",
                          context: { company, jobTitle, date },
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
                          handleWorkExperienceChange("descriptions", bullets as any);
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
