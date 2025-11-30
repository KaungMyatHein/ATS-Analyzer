import { View } from "@react-pdf/renderer";
import {
  ResumePDFSection,
  ResumePDFBulletList,
} from "components/Resume/ResumePDF/common";
import { styles } from "components/Resume/ResumePDF/styles";
import type { ResumeCustom } from "lib/redux/types";

export const ResumePDFCustom = ({
  heading,
  custom,
  themeColor,
  showBulletPoints,
  style,
  highlightSkills = [],
  highlightExactSkills = [],
  highlightFlexSkills = [],
}: {
  heading: string;
  custom: ResumeCustom;
  themeColor: string;
  showBulletPoints: boolean;
  style?: string;
  highlightSkills?: string[];
  highlightExactSkills?: string[];
  highlightFlexSkills?: string[];
}) => {
  const { descriptions } = custom;

  const isBlog = style === "blog";
  const textStyle = isBlog ? { fontFamily: "Times-Roman", lineHeight: "1.6" } : {};

  return (
    <ResumePDFSection themeColor={themeColor} heading={heading} resumeStyle={style}>
      <View style={{ ...styles.flexCol }}>
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
    </ResumePDFSection>
  );
};
