import { BaseForm } from "components/ResumeForm/Form";
import { Input, Textarea } from "components/ResumeForm/Form/InputGroup";
import { AISuggestIconButton } from "components/ResumeForm/Form/IconButton";
import { selectResume } from "lib/redux/resumeSlice";
import { useAppDispatch, useAppSelector } from "lib/redux/hooks";
import { changeProfile, selectProfile } from "lib/redux/resumeSlice";
import { ResumeProfile } from "lib/redux/types";
import { useState } from "react";

export const ProfileForm = () => {
  const profile = useAppSelector(selectProfile);
  const dispatch = useAppDispatch();
  const { name, email, phone, url, summary, location } = profile;

  const handleProfileChange = (field: keyof ResumeProfile, value: string) => {
    dispatch(changeProfile({ field, value }));
  };

  const fullResume = useAppSelector(selectResume);
  const [suggestLoading, setSuggestLoading] = useState(false);
  const [suggestError, setSuggestError] = useState("");
  const suggestSummary = async () => {
    try {
      setSuggestError("");
      setSuggestLoading(true);
      const resp = await fetch("/api/ai/suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ field: "profile.summary", context: { profile }, resume: fullResume }),
      });
      const data = await resp.json();
      if (!resp.ok) {
        const msg = data?.error || "Suggestion failed";
        setSuggestError(msg);
      } else {
        const text = data?.suggestion?.text || "";
        if (text) handleProfileChange("summary", text);
      }
    } catch {
      setSuggestError("Network error");
    } finally {
      setSuggestLoading(false);
    }
  };

  return (
    <BaseForm>
      <div className="grid grid-cols-6 gap-3">
        <Input
          label="Name"
          labelClassName="col-span-full"
          name="name"
          placeholder="Sal Khan"
          value={name}
          onChange={handleProfileChange}
        />
        <div className="relative col-span-full">
          <Textarea
            label="Objective"
            labelClassName="col-span-full"
            name="summary"
            placeholder="Entrepreneur and educator obsessed with making education free for anyone"
            value={summary}
            onChange={handleProfileChange}
          />
          <div className="absolute left-[8.6rem] top-[0.07rem]">
            <AISuggestIconButton onClick={suggestSummary} tooltipText={suggestLoading ? "Generating..." : (suggestError || "AI Suggest")} />
          </div>
          {suggestError && (
            <div className="absolute left-[11rem] top-[0.1rem] text-xs text-red-600">{suggestError}</div>
          )}
        </div>
        <Input
          label="Email"
          labelClassName="col-span-4"
          name="email"
          placeholder="hello@khanacademy.org"
          value={email}
          onChange={handleProfileChange}
        />
        <Input
          label="Phone"
          labelClassName="col-span-2"
          name="phone"
          placeholder="(123)456-7890"
          value={phone}
          onChange={handleProfileChange}
        />
        <Input
          label="Website"
          labelClassName="col-span-4"
          name="url"
          placeholder="linkedin.com/in/khanacademy"
          value={url}
          onChange={handleProfileChange}
        />
        <Input
          label="Location"
          labelClassName="col-span-2"
          name="location"
          placeholder="NYC, NY"
          value={location}
          onChange={handleProfileChange}
        />
        <div className="col-span-full">
          <label className="mb-2 block text-sm font-medium text-gray-900">
            Profile Picture
          </label>
          <div className="flex items-center gap-4">
            {profile.picture && (
              <img
                src={profile.picture}
                alt="Profile"
                className="h-16 w-16 rounded-full object-cover"
              />
            )}
            <input
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  const reader = new FileReader();
                  reader.onloadend = () => {
                    handleProfileChange("picture", reader.result as string);
                  };
                  reader.readAsDataURL(file);
                }
              }}
              className="block w-full text-sm text-gray-500 file:mr-4 file:rounded-full file:border-0 file:bg-blue-50 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-blue-700 hover:file:bg-blue-100"
            />
            {profile.picture && (
              <button
                type="button"
                onClick={() => handleProfileChange("picture", "")}
                className="text-sm text-red-600 hover:text-red-800"
              >
                Remove
              </button>
            )}
          </div>
        </div>
      </div>
    </BaseForm>
  );
};
