import { View } from "@react-pdf/renderer";
import {
  ResumePDFSection,
  ResumePDFBulletList,
  ResumePDFText,
} from "components/Resume/ResumePDF/common";
import { styles, spacing } from "components/Resume/ResumePDF/styles";
import type { ResumeWorkExperience } from "lib/redux/types";

export const ResumePDFWorkExperience = ({
  heading,
  workExperiences,
  themeColor,
  style,
  highlightSkills = [],
  highlightExactSkills = [],
  highlightFlexSkills = [],
}: {
  heading: string;
  workExperiences: ResumeWorkExperience[];
  themeColor: string;
  style?: string;
  highlightSkills?: string[];
  highlightExactSkills?: string[];
  highlightFlexSkills?: string[];
}) => {
  const isBlog = style === "blog";
  const textStyle = isBlog ? { fontFamily: "Times-Roman", lineHeight: "1.6" } : {};

  return (
    <ResumePDFSection themeColor={themeColor} heading={heading} resumeStyle={style}>
      {workExperiences.map(({ company, jobTitle, date, descriptions }, idx) => {
        // Hide company name if it is the same as the previous company
        const hideCompanyName =
          idx > 0 && company === workExperiences[idx - 1].company;

        return (
          <View key={idx} style={idx !== 0 ? { marginTop: spacing["2"] } : {}}>
            {!hideCompanyName && (
              <ResumePDFText
                style={isBlog ? { ...textStyle, fontFamily: "Times-Bold" } : textStyle}
                bold={true}
              >
                {company}
              </ResumePDFText>
            )}
            <View
              style={{
                ...styles.flexRowBetween,
                marginTop: hideCompanyName
                  ? "-" + spacing["1"]
                  : spacing["1.5"],
              }}
            >
              <ResumePDFText style={textStyle}>{jobTitle}</ResumePDFText>
              <ResumePDFText style={{ ...textStyle, fontStyle: isBlog ? "italic" : undefined, color: isBlog ? "#737373" : undefined }}>{date}</ResumePDFText>
            </View>
            <View style={{ ...styles.flexCol, marginTop: spacing["1.5"] }}>
              <ResumePDFBulletList
                items={descriptions}
                style={textStyle}
                highlightSkills={highlightSkills}
                highlightExactSkills={highlightExactSkills}
                highlightFlexSkills={highlightFlexSkills}
                highlightColor={themeColor}
              />
            </View>
          </View>
        );
      })}
    </ResumePDFSection>
  );
};
