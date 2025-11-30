import { Page, View, Document } from "@react-pdf/renderer";
import { styles, spacing } from "components/Resume/ResumePDF/styles";
import { ResumePDFProfile } from "components/Resume/ResumePDF/ResumePDFProfile";
import { ResumePDFWorkExperience } from "components/Resume/ResumePDF/ResumePDFWorkExperience";
import { ResumePDFEducation } from "components/Resume/ResumePDF/ResumePDFEducation";
import { ResumePDFProject } from "components/Resume/ResumePDF/ResumePDFProject";
import { ResumePDFSkills } from "components/Resume/ResumePDF/ResumePDFSkills";
import { ResumePDFCustom } from "components/Resume/ResumePDF/ResumePDFCustom";
import { DEFAULT_FONT_COLOR } from "lib/redux/settingsSlice";
import type { Settings, ShowForm } from "lib/redux/settingsSlice";
import type { Resume } from "lib/redux/types";
import { SuppressResumePDFErrorMessage } from "components/Resume/ResumePDF/common/SuppressResumePDFErrorMessage";

/**
 * Note: ResumePDF is supposed to be rendered inside PDFViewer. However,
 * PDFViewer is rendered too slow and has noticeable delay as you enter
 * the resume form, so we render it without PDFViewer to make it render
 * instantly. There are 2 drawbacks with this approach:
 * 1. Not everything works out of box if not rendered inside PDFViewer,
 *    e.g. svg doesn't work, so it takes in a isPDF flag that maps react
 *    pdf element to the correct dom element.
 * 2. It throws a lot of errors in console log, e.g. "<VIEW /> is using incorrect
 *    casing. Use PascalCase for React components, or lowercase for HTML elements."
 *    in development, causing a lot of noises. We can possibly workaround this by
 *    mapping every react pdf element to a dom element, but for now, we simply
 *    suppress these messages in <SuppressResumePDFErrorMessage />.
 *    https://github.com/diegomura/react-pdf/issues/239#issuecomment-487255027
 */
export const ResumePDF = ({
  resume,
  settings,
  isPDF = false,
  highlightSkills = [],
  highlightExactSkills = [],
  highlightFlexSkills = [],
}: {
  resume: Resume;
  settings: Settings;
  isPDF?: boolean;
  highlightSkills?: string[];
  highlightExactSkills?: string[];
  highlightFlexSkills?: string[];
}) => {
  const { profile, workExperiences, educations, projects, skills, custom } =
    resume;
  const { name } = profile;
  const {
    fontFamily,
    fontSize,
    documentSize,
    formToHeading,
    formToShow,
    formsOrder,
    showBulletPoints,
    style,
  } = settings;
  const themeColor = settings.themeColor || DEFAULT_FONT_COLOR;

  const showFormsOrder = formsOrder.filter((form) => formToShow[form]);

  const formTypeToComponent: { [type in ShowForm]: () => JSX.Element } = {
    workExperiences: () => (
      <ResumePDFWorkExperience
        heading={formToHeading["workExperiences"]}
        workExperiences={workExperiences}
        themeColor={themeColor}
        style={style}
        highlightSkills={highlightSkills}
        highlightExactSkills={highlightExactSkills}
        highlightFlexSkills={highlightFlexSkills}
      />
    ),
    educations: () => (
      <ResumePDFEducation
        heading={formToHeading["educations"]}
        educations={educations}
        themeColor={themeColor}
        showBulletPoints={showBulletPoints["educations"]}
        style={style}
        highlightSkills={highlightSkills}
        highlightExactSkills={highlightExactSkills}
        highlightFlexSkills={highlightFlexSkills}
      />
    ),
    projects: () => (
      <ResumePDFProject
        heading={formToHeading["projects"]}
        projects={projects}
        themeColor={themeColor}
        style={style}
        highlightSkills={highlightSkills}
        highlightExactSkills={highlightExactSkills}
        highlightFlexSkills={highlightFlexSkills}
      />
    ),
    skills: () => (
      <ResumePDFSkills
        heading={formToHeading["skills"]}
        skills={skills}
        themeColor={themeColor}
        showBulletPoints={showBulletPoints["skills"]}
        style={style}
        highlightSkills={highlightSkills}
        highlightExactSkills={highlightExactSkills}
        highlightFlexSkills={highlightFlexSkills}
      />
    ),
    custom: () => (
      <ResumePDFCustom
        heading={formToHeading["custom"]}
        custom={custom}
        themeColor={themeColor}
        showBulletPoints={showBulletPoints["custom"]}
        style={style}
        highlightSkills={highlightSkills}
        highlightExactSkills={highlightExactSkills}
        highlightFlexSkills={highlightFlexSkills}
      />
    ),
  };

  const isElegant = style === "elegant";
  const isBlog = style === "blog";

  return (
    <>
      <Document title={`${name} Resume`} author={name} producer={"OpenResume"}>
        <Page
          size={documentSize === "A4" ? "A4" : "LETTER"}
          style={{
            ...styles.flexCol,
            color: DEFAULT_FONT_COLOR,
            fontFamily,
            fontSize: fontSize + "pt",
          }}
        >
          {Boolean(settings.themeColor) && (
            <View
              style={{
                width: spacing["full"],
                height: spacing[3.5],
                backgroundColor: themeColor,
              }}
            />
          )}
          <View
            style={{
              padding: `${spacing[0]} ${spacing[20]}`,
              display: "flex",
              flexDirection: isElegant ? "row" : "column",
              gap: isElegant ? spacing["10"] : undefined,
            }}
          >
            {isElegant ? (
              <>
                {/* Left Sidebar */}
                <View style={{ width: "30%", display: "flex", flexDirection: "column" }}>
                  <ResumePDFProfile
                    profile={profile}
                    themeColor={themeColor}
                    isPDF={isPDF}
                    style={style}
                    type="sidebar"
                  />
                  <ResumePDFSkills
                    heading={formToHeading["skills"]}
                    skills={skills}
                    themeColor={themeColor}
                    showBulletPoints={showBulletPoints["skills"]}
                    style={style}
                    highlightSkills={highlightSkills}
                    highlightExactSkills={highlightExactSkills}
                    highlightFlexSkills={highlightFlexSkills}
                  />
                  <ResumePDFEducation
                    heading={formToHeading["educations"]}
                    educations={educations}
                    themeColor={themeColor}
                    showBulletPoints={showBulletPoints["educations"]}
                    style={style}
                    highlightSkills={highlightSkills}
                    highlightExactSkills={highlightExactSkills}
                    highlightFlexSkills={highlightFlexSkills}
                  />
                  <ResumePDFCustom
                    heading={formToHeading["custom"]}
                    custom={custom}
                    themeColor={themeColor}
                    showBulletPoints={showBulletPoints["custom"]}
                    style={style}
                    highlightSkills={highlightSkills}
                    highlightExactSkills={highlightExactSkills}
                    highlightFlexSkills={highlightFlexSkills}
                  />
                </View>

                {/* Right Main Content */}
                <View style={{ width: "70%", display: "flex", flexDirection: "column" }}>
                  <ResumePDFProfile
                    profile={profile}
                    themeColor={themeColor}
                    isPDF={isPDF}
                    style={style}
                    type="main"
                  />
                  <ResumePDFWorkExperience
                    heading={formToHeading["workExperiences"]}
                    workExperiences={workExperiences}
                    themeColor={themeColor}
                    style={style}
                    highlightSkills={highlightSkills}
                    highlightExactSkills={highlightExactSkills}
                    highlightFlexSkills={highlightFlexSkills}
                  />
                  <ResumePDFProject
                    heading={formToHeading["projects"]}
                    projects={projects}
                    themeColor={themeColor}
                    style={style}
                    highlightSkills={highlightSkills}
                    highlightExactSkills={highlightExactSkills}
                    highlightFlexSkills={highlightFlexSkills}
                  />
                </View>
              </>
            ) : (
              <>
                <ResumePDFProfile
                  profile={profile}
                  themeColor={themeColor}
                  isPDF={isPDF}
                  style={style}
                />
                {showFormsOrder.map((form) => {
                  const Component = formTypeToComponent[form];
                  return <Component key={form} />;
                })}
              </>
            )}
          </View>
        </Page>
      </Document>
      <SuppressResumePDFErrorMessage />
    </>
  );
};
