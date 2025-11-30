import { Form, FormSection } from "components/ResumeForm/Form";
import {
  BulletListTextarea,
  Input,
} from "components/ResumeForm/Form/InputGroup";
import { BulletListIconButton, AISuggestIconButton } from "components/ResumeForm/Form/IconButton";
import type { CreateHandleChangeArgsWithDescriptions } from "components/ResumeForm/types";
import { useAppDispatch, useAppSelector } from "lib/redux/hooks";
import { changeEducations, selectEducations } from "lib/redux/resumeSlice";
import { selectResume } from "lib/redux/resumeSlice";
import type { ResumeEducation } from "lib/redux/types";
import {
  changeShowBulletPoints,
  selectShowBulletPoints,
} from "lib/redux/settingsSlice";

import { useState } from "react";

export const EducationsForm = () => {
  const educations = useAppSelector(selectEducations);
  const dispatch = useAppDispatch();
  const fullResume = useAppSelector(selectResume);
  const showDelete = educations.length > 1;
  const form = "educations";
  const showBulletPoints = useAppSelector(selectShowBulletPoints(form));
  const [suggestLoadingIdx, setSuggestLoadingIdx] = useState<number | null>(null);
  const [suggestErrorIdx, setSuggestErrorIdx] = useState<{ [k: number]: string }>({});

  return (
    <Form form={form} addButtonText="Add School">
      {educations.map(({ school, degree, gpa, date, descriptions }, idx) => {
        const handleEducationChange = (
          ...[
            field,
            value,
          ]: CreateHandleChangeArgsWithDescriptions<ResumeEducation>
        ) => {
          dispatch(changeEducations({ idx, field, value } as any));
        };

        const handleShowBulletPoints = (value: boolean) => {
          dispatch(changeShowBulletPoints({ field: form, value }));
        };

        const showMoveUp = idx !== 0;
        const showMoveDown = idx !== educations.length - 1;

        return (
          <FormSection
            key={idx}
            form="educations"
            idx={idx}
            showMoveUp={showMoveUp}
            showMoveDown={showMoveDown}
            showDelete={showDelete}
            deleteButtonTooltipText="Delete school"
          >
            <Input
              label="School"
              labelClassName="col-span-4"
              name="school"
              placeholder="Cornell University"
              value={school}
              onChange={handleEducationChange}
            />
            <Input
              label="Date"
              labelClassName="col-span-2"
              name="date"
              placeholder="May 2018"
              value={date}
              onChange={handleEducationChange}
            />
            <Input
              label="Degree & Major"
              labelClassName="col-span-4"
              name="degree"
              placeholder="Bachelor of Science in Computer Engineering"
              value={degree}
              onChange={handleEducationChange}
            />
            <Input
              label="GPA"
              labelClassName="col-span-2"
              name="gpa"
              placeholder="3.81"
              value={gpa}
              onChange={handleEducationChange}
            />
          <div className="relative col-span-full">
            <BulletListTextarea
              label="Additional Information (Optional)"
              labelClassName="col-span-full"
              name="descriptions"
              placeholder="Free paragraph space to list out additional activities, courses, awards etc"
              value={descriptions}
              onChange={handleEducationChange}
              showBulletPoints={showBulletPoints}
            />
            <div className="absolute left-[15.6rem] top-[0.07rem]">
              <BulletListIconButton
                showBulletPoints={showBulletPoints}
                onClick={handleShowBulletPoints}
              />
            </div>
            <div className="absolute left-[13.2rem] top-[0.07rem]">
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
                        field: "education.descriptions",
                        context: { school, degree, gpa, date },
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
                        handleEducationChange("descriptions", bullets as any);
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
              <div className="absolute left-[16rem] top-[0.1rem] text-xs text-red-600">{suggestErrorIdx[idx]}</div>
            )}
          </div>
          </FormSection>
        );
      })}
    </Form>
  );
};
