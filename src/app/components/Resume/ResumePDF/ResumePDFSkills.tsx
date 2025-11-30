import { View, Text } from "@react-pdf/renderer";
import {
  ResumePDFSection,
  ResumePDFBulletList,
  ResumeFeaturedSkill,
} from "components/Resume/ResumePDF/common";
import { styles, spacing } from "components/Resume/ResumePDF/styles";
import type { ResumeSkills } from "lib/redux/types";

export const ResumePDFSkills = ({
  heading,
  skills,
  themeColor,
  showBulletPoints,
  style,
  highlightSkills = [],
  highlightExactSkills = [],
  highlightFlexSkills = [],
}: {
  heading: string;
  skills: ResumeSkills;
  themeColor: string;
  showBulletPoints: boolean;
  style?: string;
  highlightSkills?: string[];
  highlightExactSkills?: string[];
  highlightFlexSkills?: string[];
}) => {
  const { descriptions, featuredSkills, categories = [] } = skills;
  const featuredSkillsWithText = featuredSkills.filter((item) => item.skill);
  const isBlog = style === "blog";
  const textStyle = isBlog ? { lineHeight: "1.6" } : {};

  return (
    <ResumePDFSection themeColor={themeColor} heading={heading} resumeStyle={style}>
      {featuredSkillsWithText.length > 0 && (
        <View style={{ ...styles.flexRow, flexWrap: "wrap", marginTop: spacing["0.5"], marginBottom: spacing["2"] }}>
          {featuredSkillsWithText.map((featuredSkill, idx) => (
            <View key={idx} style={{ width: "50%", marginBottom: spacing["1"] }}>
              <ResumeFeaturedSkill
                skill={featuredSkill.skill}
                rating={featuredSkill.rating}
                themeColor={themeColor}
                style={textStyle}
                highlightSkills={highlightSkills}
                highlightExactSkills={highlightExactSkills}
                highlightFlexSkills={highlightFlexSkills}
              />
            </View>
          ))}
        </View>
      )}

      {/* Display skill categories with highlights */}
      {categories.length > 0 && (
        <View style={{ ...styles.flexCol, gap: isBlog ? spacing["2"] : spacing["1"] }}>
          {categories.map((cat, idx) => {
            if ((!cat.category || cat.skills.length === 0) && (!cat.highlights || cat.highlights.length === 0)) return null;

            return (
              <View key={idx} style={{ marginBottom: isBlog ? spacing["1.5"] : spacing["0.5"] }}>
                {/* Render Skills */}
                {(cat.category || cat.skills.length > 0) && (
                  <Text style={{ ...textStyle }}>
                    {cat.category && <Text style={{ fontWeight: "bold", ...textStyle }}>{cat.category}: </Text>}
                    {cat.skills.filter(s => s && s.trim()).map((skill, skillIdx, arr) => {
                      const cleanSkill = skill.trim();
                      const isLast = skillIdx === arr.length - 1;
                      const lower = cleanSkill.toLowerCase();
                      const isExact = highlightExactSkills.map((s) => s?.toLowerCase().trim()).includes(lower);
                      const isFlex = !isExact && (highlightFlexSkills.map((s) => s?.toLowerCase().trim()).includes(lower) || highlightSkills.map((s) => s?.toLowerCase().trim()).includes(lower));

                      return (
                        <Text
                          key={skillIdx}
                          style={{
                            ...textStyle,
                            backgroundColor: isExact ? "#DCFCE7" : (isFlex ? "#FEF08A" : undefined),
                          }}
                        >
                          {cleanSkill}{!isLast ? ", " : ""}
                        </Text>
                      );
                    })}
                  </Text>
                )}

                {/* Render Highlights */}
                {cat.highlights && cat.highlights.length > 0 && (
                  <View style={{ marginTop: isBlog ? spacing["1"] : spacing["0.5"], marginLeft: spacing["2"] }}>
                    <ResumePDFBulletList
                      items={cat.highlights}
                      showBulletPoints={true}
                      style={textStyle}
                      highlightSkills={highlightSkills}
                      highlightExactSkills={highlightExactSkills}
                      highlightFlexSkills={highlightFlexSkills}
                      highlightColor={themeColor}
                    />
                  </View>
                )}
              </View>
            );
          })}
        </View>
      )}

      {/* Legacy descriptions format */}
      {descriptions.length > 0 && (
        <View style={{ ...styles.flexCol, gap: isBlog ? spacing["2"] : spacing["1"], marginTop: categories.length > 0 ? spacing["2"] : 0 }}>
          {descriptions.map((desc, idx) => {
            if (!desc) return null;

            const hasColon = desc.includes(':');

            return (
              <View key={idx} style={{ marginBottom: isBlog ? spacing["1.5"] : spacing["0.5"] }}>
                <Text>
                  {hasColon ? (
                    <>
                      <Text style={{ fontWeight: "bold" }}>
                        {desc.split(':')[0]}:
                      </Text>
                      {" "}
                      <Text>
                        <ResumePDFBulletList
                          items={[desc.split(':').slice(1).join(':')]}
                          showBulletPoints={false}
                          style={textStyle}
                          highlightSkills={highlightSkills}
                          highlightExactSkills={highlightExactSkills}
                          highlightFlexSkills={highlightFlexSkills}
                          highlightColor={themeColor}
                        />
                      </Text>
                    </>
                  ) : (
                    <Text>
                      <ResumePDFBulletList
                        items={[desc]}
                        showBulletPoints={false}
                        style={textStyle}
                        highlightSkills={highlightSkills}
                        highlightExactSkills={highlightExactSkills}
                        highlightFlexSkills={highlightFlexSkills}
                        highlightColor={themeColor}
                      />
                    </Text>
                  )}
                </Text>
              </View>
            );
          })}
        </View>
      )}
    </ResumePDFSection>
  );
};
