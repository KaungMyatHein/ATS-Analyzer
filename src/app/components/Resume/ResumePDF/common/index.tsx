import { Text, View, Link } from "@react-pdf/renderer";
import type { Style } from "@react-pdf/types";
import { styles, spacing } from "components/Resume/ResumePDF/styles";
import { DEBUG_RESUME_PDF_FLAG } from "lib/constants";
import { DEFAULT_FONT_COLOR } from "lib/redux/settingsSlice";

export const ResumePDFSection = ({
  themeColor,
  heading,
  style = {},
  children,
  resumeStyle = "standard",
}: {
  themeColor?: string;
  heading?: string;
  style?: Style;
  children: React.ReactNode;
  resumeStyle?: string;
}) => {
  const isProfessional = resumeStyle === "professional";
  const isElegant = resumeStyle === "elegant";
  const isBlog = resumeStyle === "blog";

  return (
    <View
      style={{
        ...styles.flexCol,
        gap: spacing["2"],
        marginTop: spacing["5"],
        ...style,
      }}
    >
      {heading && (
        <View
          style={{
            ...styles.flexRow,
            alignItems: "center",
            justifyContent: isElegant ? "center" : "flex-start",
            borderBottom: isProfessional ? "1pt solid" : isBlog ? "0.5pt solid #d4d4d4" : undefined,
            borderColor: isProfessional ? themeColor : undefined,
            paddingBottom: isProfessional ? spacing["1"] : isBlog ? spacing["1"] : undefined,
            marginBottom: isProfessional ? spacing["2"] : isBlog ? spacing["3"] : undefined,
          }}
        >
          {themeColor && !isProfessional && !isElegant && (
            <View
              style={{
                height: "3.75pt",
                width: "30pt",
                backgroundColor: themeColor,
                marginRight: spacing["3.5"],
              }}
              debug={DEBUG_RESUME_PDF_FLAG}
            />
          )}
          <Text
            style={{
              fontWeight: "bold",
              letterSpacing: "0.3pt", // tracking-wide -> 0.025em * 12 pt = 0.3pt
              textTransform: isProfessional ? "uppercase" : undefined,
              fontSize: isProfessional ? "12pt" : isBlog ? "14pt" : undefined,
              fontFamily: isBlog ? "Helvetica" : undefined,
            }}
            debug={DEBUG_RESUME_PDF_FLAG}
          >
            {heading}
          </Text>
        </View>
      )}
      {children}
    </View>
  );
};

export const ResumePDFText = ({
  bold = false,
  themeColor,
  style = {},
  children,
}: {
  bold?: boolean;
  themeColor?: string;
  style?: Style;
  children: React.ReactNode;
}) => {
  return (
    <Text
      style={{
        color: themeColor || DEFAULT_FONT_COLOR,
        fontWeight: bold ? "bold" : "normal",
        ...style,
      }}
      debug={DEBUG_RESUME_PDF_FLAG}
    >
      {children}
    </Text>
  );
};

export const ResumePDFBulletList = ({
  items,
  showBulletPoints = true,
  style = {},
  highlightSkills = [],
  highlightExactSkills = [],
  highlightFlexSkills = [],
  highlightColor,
}: {
  items: string[];
  showBulletPoints?: boolean;
  style?: Style;
  highlightSkills?: string[];
  highlightExactSkills?: string[];
  highlightFlexSkills?: string[];
  highlightColor?: string;
}) => {
  const norm = (s: string) => s.toLowerCase();
  const skills = Array.isArray(highlightSkills)
    ? Array.from(new Set(highlightSkills.map((s) => s?.trim()).filter(Boolean)))
    : [];
  const exactSkills = Array.isArray(highlightExactSkills)
    ? Array.from(new Set(highlightExactSkills.map((s) => s?.trim()).filter(Boolean)))
    : [];
  const flexSkills = Array.isArray(highlightFlexSkills)
    ? Array.from(new Set(highlightFlexSkills.map((s) => s?.trim()).filter(Boolean)))
    : [];

  const renderHighlighted = (text: string) => {
    const stop = new Set(["and","the","with","of","in","for","to","a","an","on","at","by","from"]);
    const variant = (t: string) => {
      const v: string[] = [t];
      if (t.endsWith("s") && t.length > 3) v.push(t.slice(0, -1));
      if (t.endsWith("ing") && t.length > 5) v.push(t.slice(0, -3));
      if (t.endsWith("er") && t.length > 4) v.push(t.slice(0, -2));
      if (t.endsWith("ion") && t.length > 5) v.push(t.slice(0, -3));
      if (t.endsWith("ions") && t.length > 6) v.push(t.slice(0, -4));
      if (t.endsWith("ity") && t.length > 5) v.push(t.slice(0, -3));
      if (t.endsWith("ties") && t.length > 6) v.push(t.slice(0, -4));
      return Array.from(new Set(v));
    };
    const toTokens = (s: string) => s.toLowerCase().replace(/[^a-z0-9 ]+/g, " ").split(/\s+/).filter(Boolean);
    const tokenSetUnion = new Set<string>();
    const tokenSetExact = new Set<string>();
    const tokenSetFlex = new Set<string>();
    const addTokens = (arr: string[], set: Set<string>) => {
      for (const k of arr) {
        for (const t of toTokens(k)) {
          if (!stop.has(t)) for (const v of variant(t)) set.add(v);
        }
      }
    };
    addTokens(skills, tokenSetUnion);
    addTokens(exactSkills, tokenSetExact);
    addTokens(flexSkills, tokenSetFlex);
    if (tokenSetUnion.size === 0 && tokenSetExact.size === 0 && tokenSetFlex.size === 0) return text;

    const pieces = text.split(/(\b)/); // keep word boundaries
    return pieces.map((p, idx) => {
      const w = p.match(/^[A-Za-z0-9]+$/) ? p : null;
      if (!w) return p;
      const lw = w.toLowerCase();
      const vars = Array.from(variant(lw));
      const isExact = vars.some((v) => tokenSetExact.has(v));
      const isFlex = vars.some((v) => tokenSetFlex.has(v)) || vars.some((v) => tokenSetUnion.has(v));
      if (!isExact && !isFlex) return p;
      const bg = isExact ? "#DCFCE7" : "#FEF08A"; // green-100 for exact, yellow-200 for flex
      return (
        <Text key={`hl-${idx}`} style={{ backgroundColor: bg }}>
          {p}
        </Text>
      );
    });
  };

  return (
    <>
      {items.map((item, idx) => (
        <View style={{ ...styles.flexRow }} key={idx}>
          {showBulletPoints && (
            <ResumePDFText
              style={{
                paddingLeft: spacing["2"],
                paddingRight: spacing["2"],
                lineHeight: "1.3",
                ...style,
              }}
              bold={true}
            >
              {"•"}
            </ResumePDFText>
          )}
          <ResumePDFText style={{ lineHeight: "1.3", flexGrow: 1, flexBasis: 0, ...style }}>
            {renderHighlighted(item)}
          </ResumePDFText>
        </View>
      ))}
    </>
  );
};

export const ResumePDFLink = ({
  src,
  isPDF,
  children,
}: {
  src: string;
  isPDF: boolean;
  children: React.ReactNode;
}) => {
  if (isPDF) {
    return (
      <Link src={src} style={{ textDecoration: "none" }}>
        {children}
      </Link>
    );
  }
  return (
    <a
      href={src}
      style={{ textDecoration: "none" }}
      target="_blank"
      rel="noreferrer"
    >
      {children}
    </a>
  );
};

export const ResumeFeaturedSkill = ({
  skill,
  rating,
  themeColor,
  style = {},
  highlightSkills = [],
  highlightExactSkills = [],
  highlightFlexSkills = [],
}: {
  skill: string;
  rating: number;
  themeColor: string;
  style?: Style;
  highlightSkills?: string[];
  highlightExactSkills?: string[];
  highlightFlexSkills?: string[];
}) => {
  const numCircles = 5;
  const sLower = skill.toLowerCase().trim();
  const isExact = Array.isArray(highlightExactSkills) ? highlightExactSkills.map((s) => s?.toLowerCase().trim()).includes(sLower) : false;
  const isFlex = !isExact && (Array.isArray(highlightFlexSkills) ? highlightFlexSkills.map((s) => s?.toLowerCase().trim()).includes(sLower) : (Array.isArray(highlightSkills) ? highlightSkills.map((s) => s?.toLowerCase().trim()).includes(sLower) : false));

  return (
    <View style={{ ...styles.flexRow, alignItems: "center", ...style }}>
      <ResumePDFText style={{ marginRight: spacing[0.5], ...style, backgroundColor: isExact ? "#DCFCE7" : (isFlex ? "#FEF08A" : undefined) }}>
        {skill}
      </ResumePDFText>
      {[...Array(numCircles)].map((_, idx) => (
        <View
          key={idx}
          style={{
            height: "9pt",
            width: "9pt",
            marginLeft: "2.25pt",
            backgroundColor: rating >= idx ? themeColor : "#d9d9d9",
            borderRadius: "100%",
          }}
        />
      ))}
    </View>
  );
};
