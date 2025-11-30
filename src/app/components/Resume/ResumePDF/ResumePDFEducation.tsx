import { View } from "@react-pdf/renderer";
import {
  ResumePDFBulletList,
  ResumePDFSection,
  ResumePDFText,
} from "components/Resume/ResumePDF/common";
import { styles, spacing } from "components/Resume/ResumePDF/styles";
import type { ResumeEducation } from "lib/redux/types";

export const ResumePDFEducation = ({
  heading,
  educations,
  themeColor,
  showBulletPoints,
  style,
  highlightSkills = [],
  highlightExactSkills = [],
  highlightFlexSkills = [],
}: {
  heading: string;
  educations: ResumeEducation[];
  themeColor: string;
  showBulletPoints: boolean;
  style?: string;
  highlightSkills?: string[];
  highlightExactSkills?: string[];
  highlightFlexSkills?: string[];
}) => {
  const isBlog = style === "blog";
  const textStyle = isBlog ? { fontFamily: "Times-Roman", lineHeight: "1.6" } : {};

  return (
    <ResumePDFSection themeColor={themeColor} heading={heading} resumeStyle={style}>
      {educations.map(
        ({ school, degree, date, gpa, descriptions = [] }, idx) => {
          // Hide school name if it is the same as the previous school
          const hideSchoolName =
            idx > 0 && school === educations[idx - 1].school;
          const showDescriptions = descriptions.join() !== "";

          return (
            <View key={idx}>
              {!hideSchoolName && (
                <ResumePDFText
                  style={isBlog ? { ...textStyle, fontFamily: "Times-Bold" } : textStyle}
                  bold={true}
                >
                  {school}
                </ResumePDFText>
              )}
              <View
                style={{
                  ...styles.flexRowBetween,
                  marginTop: hideSchoolName
                    ? "-" + spacing["1"]
                    : spacing["1.5"],
                }}
              >
                <ResumePDFText style={textStyle}>{`${gpa
                  ? `${degree} - ${Number(gpa) ? gpa + " GPA" : gpa}`
                  : degree
                  }`}</ResumePDFText>
                <ResumePDFText style={{ ...textStyle, fontStyle: isBlog ? "italic" : undefined, color: isBlog ? "#737373" : undefined }}>{date}</ResumePDFText>
              </View>
              {showDescriptions && (
                <View style={{ ...styles.flexCol, marginTop: spacing["1.5"] }}>
                <ResumePDFBulletList
                  items={descriptions}
                  showBulletPoints={showBulletPoints}
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
        }
      )}
    </ResumePDFSection>
  );
};
