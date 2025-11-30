import { View, Image } from "@react-pdf/renderer";
import {
  ResumePDFIcon,
  type IconType,
} from "components/Resume/ResumePDF/common/ResumePDFIcon";
import { styles, spacing } from "components/Resume/ResumePDF/styles";
import {
  ResumePDFLink,
  ResumePDFSection,
  ResumePDFText,
} from "components/Resume/ResumePDF/common";
import type { ResumeProfile } from "lib/redux/types";

export const ResumePDFProfile = ({
  profile,
  themeColor,
  isPDF,
  style = "standard",
  type = "all",
}: {
  profile: ResumeProfile;
  themeColor: string;
  isPDF: boolean;
  style?: string;
  type?: "all" | "main" | "sidebar";
}) => {
  const { name, email, phone, url, summary, location } = profile;
  const iconProps = { email, phone, location, url };

  const isElegant = style === "elegant";
  const isProfessional = style === "professional";
  const isBlog = style === "blog";

  const showMain = type === "all" || type === "main";
  const showSidebar = type === "all" || type === "sidebar";

  if (isBlog) {
    return (
      <ResumePDFSection style={{ marginTop: spacing["4"] }}>
        <View style={{ ...styles.flexRow, justifyContent: "space-between", alignItems: "flex-start" }}>
          <View style={{ flexDirection: "column", maxWidth: "65%" }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: spacing["4"] }}>
              {profile.picture && (
                isPDF ? (
                  <Image
                    src={profile.picture}
                    style={{
                      width: "60pt",
                      height: "60pt",
                      borderRadius: "30pt",
                      objectFit: "cover",
                    }}
                  />
                ) : (
                  <img
                    src={profile.picture}
                    style={{
                      width: "60pt",
                      height: "60pt",
                      borderRadius: "30pt",
                      objectFit: "cover",
                    }}
                    alt=""
                  />
                )
              )}
              <ResumePDFText
                bold={true}
                themeColor={themeColor}
                style={{
                  fontSize: "32pt",
                  fontFamily: "Times-Roman",
                }}
              >
                {name}
              </ResumePDFText>
            </View>
            {summary && (
              <ResumePDFText
                style={{
                  marginTop: spacing["2"],
                  fontFamily: "Times-Roman",
                  fontSize: "12pt",
                  fontStyle: "italic",
                  lineHeight: "1.6",
                }}
              >
                {summary}
              </ResumePDFText>
            )}
          </View>

          <View style={{ flexDirection: "column", gap: spacing["1.5"], alignItems: "flex-end", marginTop: spacing["1"] }}>
            {Object.entries(iconProps).map(([key, value]) => {
              if (!value) return null;

              let iconType = key as IconType;
              if (key === "url") {
                if (value.includes("github")) {
                  iconType = "url_github";
                } else if (value.includes("linkedin")) {
                  iconType = "url_linkedin";
                }
              }

              const shouldUseLinkWrapper = ["email", "url", "phone"].includes(key);
              const Wrapper = ({ children }: { children: React.ReactNode }) => {
                if (!shouldUseLinkWrapper) return <>{children}</>;

                let src = "";
                switch (key) {
                  case "email": {
                    src = `mailto:${value}`;
                    break;
                  }
                  case "phone": {
                    src = `tel:${value.replace(/[^\d+]/g, "")}`;
                    break;
                  }
                  default: {
                    src = value.startsWith("http") ? value : `https://${value}`;
                  }
                }

                return (
                  <ResumePDFLink src={src} isPDF={isPDF}>
                    {children}
                  </ResumePDFLink>
                );
              };

              return (
                <View
                  key={key}
                  style={{
                    ...styles.flexRow,
                    alignItems: "center",
                    gap: spacing["2"],
                  }}
                >
                  <Wrapper>
                    <ResumePDFText style={{ fontFamily: "Times-Roman", fontSize: "10pt" }}>
                      {value}
                    </ResumePDFText>
                  </Wrapper>
                  <ResumePDFIcon type={iconType} isPDF={isPDF} />
                </View>
              );
            })}
          </View>
        </View>
      </ResumePDFSection>
    );
  }

  return (
    <ResumePDFSection style={{ marginTop: spacing["4"] }}>
      {showMain && (
        <View style={{ ...styles.flexRow, alignItems: "center", gap: spacing["4"] }}>
          {profile.picture && (
            isPDF ? (
              <Image
                src={profile.picture}
                style={{
                  width: "60pt",
                  height: "60pt",
                  borderRadius: "30pt",
                  objectFit: "cover",
                }}
              />
            ) : (
              <img
                src={profile.picture}
                style={{
                  width: "60pt",
                  height: "60pt",
                  borderRadius: "30pt",
                  objectFit: "cover",
                }}
                alt=""
              />
            )
          )}
          <View style={{ flex: 1 }}>
            <ResumePDFText
              bold={true}
              themeColor={themeColor}
              style={{
                fontSize: isProfessional ? "24pt" : "20pt",
                textAlign: isElegant ? "left" : "left",
                textTransform: isProfessional ? "uppercase" : undefined,
              }}
            >
              {name}
            </ResumePDFText>
            {summary && (
              <ResumePDFText
                style={{
                  textAlign: isElegant ? "left" : "left",
                }}
              >
                {summary}
              </ResumePDFText>
            )}
          </View>
        </View>
      )}

      {showSidebar && (
        <View
          style={{
            ...styles.flexRowBetween,
            flexWrap: "wrap",
            marginTop: spacing["0.5"],
            justifyContent: isElegant ? "flex-start" : "space-between", // Reset for 2-col elegant
            gap: isElegant ? spacing["2"] : undefined,
            flexDirection: isElegant ? "column" : "row", // Stack icons for sidebar
            alignItems: isElegant ? "flex-start" : "center",
          }}
        >
          {Object.entries(iconProps).map(([key, value]) => {
            if (!value) return null;

            let iconType = key as IconType;
            if (key === "url") {
              if (value.includes("github")) {
                iconType = "url_github";
              } else if (value.includes("linkedin")) {
                iconType = "url_linkedin";
              }
            }

            const shouldUseLinkWrapper = ["email", "url", "phone"].includes(key);
            const Wrapper = ({ children }: { children: React.ReactNode }) => {
              if (!shouldUseLinkWrapper) return <>{children}</>;

              let src = "";
              switch (key) {
                case "email": {
                  src = `mailto:${value}`;
                  break;
                }
                case "phone": {
                  src = `tel:${value.replace(/[^\d+]/g, "")}`; // Keep only + and digits
                  break;
                }
                default: {
                  src = value.startsWith("http") ? value : `https://${value}`;
                }
              }

              return (
                <ResumePDFLink src={src} isPDF={isPDF}>
                  {children}
                </ResumePDFLink>
              );
            };

            return (
              <View
                key={key}
                style={{
                  ...styles.flexRow,
                  alignItems: "center",
                  gap: spacing["1"],
                }}
              >
                <ResumePDFIcon type={iconType} isPDF={isPDF} />
                <Wrapper>
                  <ResumePDFText>{value}</ResumePDFText>
                </Wrapper>
              </View>
            );
          })}
        </View>
      )}
    </ResumePDFSection>
  );
};
