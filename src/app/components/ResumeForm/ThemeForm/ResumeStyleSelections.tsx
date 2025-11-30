import { cx } from "lib/cx";
import {
    changeSettings,
    selectSettings,
    type GeneralSetting,
} from "lib/redux/settingsSlice";

export const ResumeStyleSelections = ({
    themeColor,
    selectedStyle,
    handleSettingsChange,
}: {
    themeColor: string;
    selectedStyle: string;
    handleSettingsChange: (field: GeneralSetting, value: string) => void;
}) => {
    const styles = [
        { name: "Standard", value: "standard" },
        { name: "Professional", value: "professional" },
        { name: "Elegant", value: "elegant" },
        { name: "Blog", value: "blog" },
    ];

    return (
        <div className="mt-3 flex flex-wrap gap-2">
            {styles.map((style) => (
                <div
                    key={style.value}
                    className={cx(
                        "cursor-pointer rounded-md border px-3 py-2 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1",
                        selectedStyle === style.value
                            ? "border-transparent text-white"
                            : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                    )}
                    style={{
                        backgroundColor:
                            selectedStyle === style.value ? themeColor : undefined,
                        borderColor: selectedStyle === style.value ? themeColor : undefined,
                    }}
                    onClick={() => handleSettingsChange("style", style.value)}
                    tabIndex={0}
                    onKeyDown={(e) => {
                        if (["Enter", " "].includes(e.key)) {
                            handleSettingsChange("style", style.value);
                        }
                    }}
                >
                    {style.name}
                </div>
            ))}
        </div>
    );
};
