import { Form } from "components/ResumeForm/Form";
import {
  BulletListTextarea,
  InputGroupWrapper,
} from "components/ResumeForm/Form/InputGroup";
import { FeaturedSkillInput } from "components/ResumeForm/Form/FeaturedSkillInput";
import { BulletListIconButton, AISuggestIconButton } from "components/ResumeForm/Form/IconButton";
import { useAppDispatch, useAppSelector } from "lib/redux/hooks";
import { selectSkills, changeSkills, selectResume } from "lib/redux/resumeSlice";
import {
  selectShowBulletPoints,
  changeShowBulletPoints,
  selectThemeColor,
} from "lib/redux/settingsSlice";
import { useState } from "react";

export const SkillsForm = () => {
  const skills = useAppSelector(selectSkills);
  const dispatch = useAppDispatch();
  const { featuredSkills, descriptions, categories = [] } = skills;
  const form = "skills";
  const showBulletPoints = useAppSelector(selectShowBulletPoints(form));
  const themeColor = useAppSelector(selectThemeColor) || "#38bdf8";
  const fullResume = useAppSelector(selectResume);
  const [suggestLoading, setSuggestLoading] = useState(false);
  const [suggestError, setSuggestError] = useState("");

  const handleSkillsChange = (field: "descriptions" | "categories" | "featuredSkills", value: any) => {
    dispatch(changeSkills({ field, value } as any));
  };

  const handleFeaturedSkillsChange = (
    idx: number,
    skill: string,
    rating: number
  ) => {
    dispatch(changeSkills({ field: "featuredSkills", idx, skill, rating }));
  };

  const handleShowBulletPoints = (value: boolean) => {
    dispatch(changeShowBulletPoints({ field: form, value }));
  };

  const addCategory = () => {
    const newCategories = [...categories, { category: "", skills: [], highlights: [] }];
    handleSkillsChange("categories", newCategories);
  };

  const removeCategory = (index: number) => {
    const newCategories = categories.filter((_, idx) => idx !== index);
    handleSkillsChange("categories", newCategories);
  };

  const updateCategory = (
    index: number,
    field: "category" | "skills" | "highlights",
    value: string | string[]
  ) => {
    const newCategories = JSON.parse(JSON.stringify(categories));
    if (field === "category") {
      newCategories[index].category = value as string;
    } else if (field === "skills") {
      newCategories[index].skills = value as string[];
    } else if (field === "highlights") {
      newCategories[index].highlights = value as string[];
    }
    handleSkillsChange("categories", newCategories);
  };

  return (
    <Form form={form}>
      <div className="col-span-full grid grid-cols-6 gap-3">
        <InputGroupWrapper
          label="Skill Categories"
          className="col-span-full"
        >
          <p className="mt-2 text-sm font-normal text-gray-600">
            Add skill categories. You can add a list of skills for each category.
          </p>
        </InputGroupWrapper>

        {categories.map((cat, catIdx) => (
          <div key={catIdx} className="col-span-full rounded-md border border-gray-300 p-4">
            <div className="mb-3 flex items-center gap-2">
              <input
                type="text"
                placeholder="Category Name (e.g., Programming Languages)"
                value={cat.category}
                onChange={(e) => updateCategory(catIdx, "category", e.target.value)}
                className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => removeCategory(catIdx)}
                className="rounded-md bg-red-500 px-3 py-2 text-sm font-medium text-white hover:bg-red-600"
              >
                Remove
              </button>
            </div>

            <div className="mb-3">
              <label className="mb-1 block text-xs font-medium text-gray-700">Skills (comma-separated)</label>
              <input
                type="text"
                placeholder="e.g., Python, JavaScript, TypeScript"
                value={cat.skills.join(",")}
                onChange={(e) => {
                  const skillsArray = e.target.value.split(",").map((s) => s.trim()).filter(Boolean);
                  updateCategory(catIdx, "skills", skillsArray);
                }}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div className="mb-3">
              <label className="mb-1 block text-xs font-medium text-gray-700">Highlights (bullet list)</label>
              <BulletListTextarea
                label=""
                labelClassName=""
                name={`highlights-${catIdx}` as any}
                placeholder="Add highlights"
                value={Array.isArray(cat.highlights) ? cat.highlights : []}
                onChange={(name, value) => updateCategory(catIdx, "highlights", value)}
                showBulletPoints={true}
              />
            </div>
            
          </div>
        ))}

        <button
          type="button"
          onClick={addCategory}
          className="col-span-full rounded-md border-2 border-dashed border-gray-300 px-4 py-3 text-sm font-medium text-gray-600 hover:border-gray-400 hover:text-gray-700"
        >
          + Add Skill Category
        </button>

        <div className="col-span-full mb-4 mt-6 border-t-2 border-dotted border-gray-200" />

        <div className="relative col-span-full">
          <BulletListTextarea
            label="Additional Skills (Optional - Legacy Format)"
            labelClassName="col-span-full"
            name="descriptions"
            placeholder="Bullet points"
            value={descriptions}
            onChange={handleSkillsChange}
            showBulletPoints={showBulletPoints}
          />
          <div className="absolute left-[4.5rem] top-[0.07rem]">
            <BulletListIconButton
              showBulletPoints={showBulletPoints}
              onClick={handleShowBulletPoints}
            />
          </div>
          <div className="absolute left-[2.2rem] top-[0.07rem]">
            <AISuggestIconButton
              tooltipText={suggestLoading ? "Generating..." : (suggestError || "AI Suggest")}
              onClick={async () => {
                try {
                  setSuggestError("");
                  setSuggestLoading(true);
                  const resp = await fetch("/api/ai/suggest", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      field: "skills.descriptions",
                      context: {},
                      resume: fullResume,
                    }),
                  });
                  const data = await resp.json();
                  if (!resp.ok) {
                    const msg = data?.error || "Suggestion failed";
                    setSuggestError(msg);
                  } else {
                    const bullets = Array.isArray(data?.suggestion?.bullets)
                      ? data.suggestion.bullets.filter(Boolean)
                      : [];
                    if (bullets.length) {
                      handleSkillsChange("descriptions", bullets as any);
                    } else if (typeof data?.suggestion?.text === "string") {
                      handleSkillsChange("descriptions", [data.suggestion.text] as any);
                    }
                  }
                } catch {
                  setSuggestError("Network error");
                } finally {
                  setSuggestLoading(false);
                }
              }}
            />
          </div>
          {suggestError && (
            <div className="absolute left-[5.2rem] top-[0.1rem] text-xs text-red-600">{suggestError}</div>
          )}
        </div>

        <div className="col-span-full mb-4 mt-6 border-t-2 border-dotted border-gray-200" />

        <InputGroupWrapper
          label="Featured Skills (Optional)"
          className="col-span-full"
        >
          <p className="mt-2 text-sm font-normal text-gray-600">
            Featured skills is optional to highlight top skills, with more
            circles mean higher proficiency.
          </p>
        </InputGroupWrapper>

        {featuredSkills.map(({ skill, rating }, idx) => (
          <div key={idx} className="col-span-3 flex items-end gap-2">
            <div className="flex-1">
              <FeaturedSkillInput
                skill={skill}
                rating={rating}
                setSkillRating={(newSkill, newRating) => {
                  handleFeaturedSkillsChange(idx, newSkill, newRating);
                }}
                placeholder={`Featured Skill ${idx + 1}`}
                circleColor={themeColor}
              />
            </div>
            <button
              type="button"
              onClick={() => {
                const newFeaturedSkills = featuredSkills.filter((_, i) => i !== idx);
                handleSkillsChange("featuredSkills", newFeaturedSkills);
              }}
              className="mb-2 rounded-md bg-red-100 p-2 text-red-600 hover:bg-red-200"
              aria-label="Remove featured skill"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        ))}

        <button
          type="button"
          onClick={() => {
            const newFeaturedSkills = [...featuredSkills, { skill: "", rating: 4 }];
            handleSkillsChange("featuredSkills", newFeaturedSkills);
          }}
          className="col-span-full mt-2 rounded-md border-2 border-dashed border-gray-300 px-4 py-3 text-sm font-medium text-gray-600 hover:border-gray-400 hover:text-gray-700"
        >
          + Add Featured Skill
        </button>
      </div>
    </Form>
  );
};
