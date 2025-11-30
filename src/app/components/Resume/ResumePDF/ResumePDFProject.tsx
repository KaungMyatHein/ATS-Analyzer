import { View } from "@react-pdf/renderer";
import {
  ResumePDFSection,
  ResumePDFBulletList,
  ResumePDFText,
} from "components/Resume/ResumePDF/common";
import { styles, spacing } from "components/Resume/ResumePDF/styles";
import type { ResumeProject } from "lib/redux/types";

export const ResumePDFProject = ({
  heading,
  projects,
  themeColor,
  style,
  highlightSkills = [],
  highlightExactSkills = [],
  highlightFlexSkills = [],
}: {
  heading: string;
  projects: ResumeProject[];
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
      {projects.map(({ project, date, descriptions }, idx) => (
        <View key={idx}>
          <View
            style={{
              ...styles.flexRowBetween,
              marginTop: spacing["0.5"],
            }}
          >
            <ResumePDFText
              style={isBlog ? { ...textStyle, fontFamily: "Times-Bold" } : textStyle}
              bold={true}
            >
              {project}
            </ResumePDFText>
            <ResumePDFText style={{ ...textStyle, fontStyle: isBlog ? "italic" : undefined, color: isBlog ? "#737373" : undefined }}>{date}</ResumePDFText>
          </View>
          <View style={{ ...styles.flexCol, marginTop: spacing["0.5"] }}>
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
      ))}
    </ResumePDFSection>
  );
};
