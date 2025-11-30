import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "api/auth/[...nextauth]/route";
import { prisma } from "lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let { jd, resume, mode } = await req.json();
    if (!jd) {
      return NextResponse.json({ error: "Missing jd" }, { status: 400 });
    }
    // Fallback: if resume not provided or empty, load latest resume from DB
    if (!resume || (typeof resume === "object" && Object.keys(resume).length === 0)) {
      const latest = await prisma.resume.findFirst({
        where: { userId: session.user.id },
        orderBy: { updatedAt: "desc" },
        select: { data: true },
      });
      if (latest?.data) {
        try {
          resume = JSON.parse(latest.data);
        } catch {}
      }
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { geminiApiKey: true },
    });

    const apiKey = user?.geminiApiKey;
    if (!apiKey) {
      return NextResponse.json({ error: "Missing Gemini API key" }, { status: 400 });
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent?key=${apiKey}`;

    const prompt = [
      "You are an ATS analyzer.",
      "From the job description, extract skill keywords spanning hard skills, soft skills, design skills, personality traits/skills, and any other relevant skills.",
      "Return concise guidance.",
      "Output strictly JSON with keys: keywords (string[]), feedback (string).",
      "Do not include markdown fences or extra commentary.",
      "JobDescription:",
      jd,
    ].join("\n\n");

    const body = {
      contents: [
        {
          role: "user",
          parts: [{ text: prompt }],
        },
      ],
      generationConfig: {
        temperature: 0.2,
      },
    };

    const resp = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!resp.ok) {
      const errText = await resp.text();
      return NextResponse.json({ error: "Gemini request failed", details: errText }, { status: 502 });
    }

    const data = await resp.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
    
    const clean = (s: string) => {
      let t = s.trim();
      if (t.startsWith("```")) {
        t = t.replace(/^```[a-zA-Z]*\n?/, "");
        if (t.endsWith("```")) t = t.replace(/```$/, "");
      }
      const i = t.indexOf("{");
      const j = t.lastIndexOf("}");
      if (i >= 0 && j >= i) t = t.slice(i, j + 1);
      return t.trim();
    };

    let parsed: any = null;
    const cleaned = clean(text);
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      parsed = { raw: text };
    }

    const collectSources = (val: any) => {
      const src: Record<string, string[]> = {
        profile_summary: [],
        profile_misc: [],
        work: [],
        education: [],
        projects: [],
        skills_descriptions: [],
        featured: [],
        categories_names: [],
        categories_skills: [],
        categories_highlights: [],
      };
      if (!val) return src;
      try {
        if (typeof val.profile?.summary === "string") src.profile_summary.push(val.profile.summary);
        if (typeof val.profile?.name === "string") src.profile_misc.push(val.profile.name);
        if (typeof val.profile?.location === "string") src.profile_misc.push(val.profile.location);
        if (typeof val.profile?.url === "string") src.profile_misc.push(val.profile.url);
        (val.workExperiences || []).forEach((w: any) => {
          if (typeof w.company === "string") src.work.push(w.company);
          if (typeof w.jobTitle === "string") src.work.push(w.jobTitle);
          if (typeof w.date === "string") src.work.push(w.date);
          (w.descriptions || []).forEach((d: any) => { if (typeof d === "string") src.work.push(d); });
        });
        (val.educations || []).forEach((e: any) => {
          if (typeof e.school === "string") src.education.push(e.school);
          if (typeof e.degree === "string") src.education.push(e.degree);
          if (typeof e.gpa === "string") src.education.push(e.gpa);
          if (typeof e.date === "string") src.education.push(e.date);
          (e.descriptions || []).forEach((d: any) => { if (typeof d === "string") src.education.push(d); });
        });
        (val.projects || []).forEach((p: any) => {
          if (typeof p.project === "string") src.projects.push(p.project);
          if (typeof p.date === "string") src.projects.push(p.date);
          (p.descriptions || []).forEach((d: any) => { if (typeof d === "string") src.projects.push(d); });
        });
        (val.skills?.descriptions || []).forEach((s: any) => { if (typeof s === "string") src.skills_descriptions.push(s); });
        (val.skills?.featuredSkills || []).forEach((fs: any) => { if (typeof fs?.skill === "string") src.featured.push(fs.skill); });
        (val.skills?.categories || []).forEach((cat: any) => {
          if (typeof cat?.category === "string") src.categories_names.push(cat.category);
          (cat?.skills || []).forEach((s: any) => { if (typeof s === "string") src.categories_skills.push(s); });
          (cat?.highlights || []).forEach((h: any) => { if (typeof h === "string") src.categories_highlights.push(h); });
        });
      } catch {}
      return src;
    };

    const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim();
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
    const sources = collectSources(resume);
    const resumeStrings = Object.values(sources).flat();
    const corpus = normalize(resumeStrings.join(" \n "));
    const corpusTokens = new Set(corpus.split(" ").filter((t) => t && !stop.has(t)));
    const corpusVariants = new Set<string>();
    corpusTokens.forEach((ct) => {
      variant(ct).forEach((v) => corpusVariants.add(v));
    });
    const keywords: string[] = Array.isArray(parsed?.keywords) ? parsed.keywords.filter(Boolean) : [];

    const SOURCE_WEIGHTS: Record<string, number> = {
      featured: 1.2,
      categories_skills: 1.0,
      categories_highlights: 0.95,
      categories_names: 0.9,
      skills_descriptions: 0.9,
      work: 1.1,
      projects: 1.05,
      education: 0.9,
      profile_summary: 0.85,
      profile_misc: 0.8,
    };
    const sourceTexts: Record<string, string> = {};
    const sourceTokens: Record<string, Set<string>> = {};
    const sourceVariants: Record<string, Set<string>> = {};
    Object.keys(sources).forEach((k) => {
      const txt = normalize(sources[k].join(" \n "));
      sourceTexts[k] = txt;
      const toks = new Set(txt.split(" ").filter((t) => t && !stop.has(t)));
      sourceTokens[k] = toks;
      const vars = new Set<string>();
      toks.forEach((ct) => variant(ct).forEach((v) => vars.add(v)));
      sourceVariants[k] = vars;
    });

    const phraseAliases = (s: string) => {
      const a: Record<string, string[]> = {
        // Software & Web
        "js": ["javascript"],
        "javascript": ["js"],
        "ts": ["typescript"],
        "typescript": ["ts"],
        "node": ["node.js","nodejs"],
        "node.js": ["node","nodejs"],
        "nodejs": ["node","node.js"],
        "react": ["react.js","reactjs"],
        "react.js": ["react","reactjs"],
        "reactjs": ["react","react.js"],
        "vue": ["vue.js","vuejs"],
        "vue.js": ["vue","vuejs"],
        "vuejs": ["vue","vue.js"],
        "angular": ["angular.js","angularjs"],
        "angular.js": ["angular","angularjs"],
        "angularjs": ["angular","angular.js"],
        "next": ["next.js","nextjs"],
        "next.js": ["next","nextjs"],
        "nextjs": ["next","next.js"],
        "nuxt": ["nuxt.js","nuxtjs"],
        "nuxt.js": ["nuxt","nuxtjs"],
        "nuxtjs": ["nuxt","nuxt.js"],
        "express": ["express.js"],
        "express.js": ["express"],
        "rails": ["ruby on rails"],
        "spring": ["spring boot"],
        ".net": ["dotnet","net"],
        "dotnet": [".net","net"],
        "c#": ["csharp"],
        "csharp": ["c#"],
        "c++": ["cpp"],
        "cpp": ["c++"],
        "sql server": ["mssql"],
        "mssql": ["sql server"],
        "postgres": ["postgresql"],
        "mysql": ["my sql"],
        "oracle db": ["oracle database","oracle"],
        "nosql": ["no sql"],
        "mongodb": ["mongo"],
        "kafka": ["apache kafka"],
        "grpc": ["g rpc"],
        "rest": ["rest api"],
        "graphql": ["graph ql"],
        "microservices": ["micro services"],
        "serverless": ["server less"],
        "docker": ["containers"],
        "k8s": ["kubernetes"],
        "terraform": ["tf"],
        "ansible": ["configuration management"],
        "aws": ["amazon web services","amazon cloud"],
        "gcp": ["google cloud","google cloud platform"],
        "azure": ["microsoft azure"],
        "lambda": ["aws lambda"],
        "s3": ["amazon s3"],
        "ec2": ["amazon ec2"],
        "cloudfront": ["amazon cloudfront"],
        "iam": ["identity and access management"],
        "vpc": ["virtual private cloud"],
        "rds": ["aws rds"],
        "dynamodb": ["aws dynamodb"],
        "bigquery": ["google bigquery"],
        "pub/sub": ["pubsub"],
        "pubsub": ["pub/sub"],
        "spark": ["apache spark"],
        "hadoop": ["apache hadoop"],
        "airflow": ["apache airflow"],
        "dbt": ["data build tool"],
        "power bi": ["pbi"],
        "looker": ["google looker"],
        "snowflake": ["sf"],
        "redshift": ["amazon redshift"],
        "etl": ["extract transform load","elt"],
        "elt": ["extract load transform","etl"],
        "html5": ["html"],
        "css3": ["css"],
        // Data/ML/AI
        "nlp": ["natural language processing"],
        "ml": ["machine learning"],
        "ai": ["artificial intelligence"],
        "dl": ["deep learning"],
        "cv": ["computer vision"],
        "sklearn": ["scikit-learn"],
        "tf": ["tensorflow"],
        "llm": ["large language model"],
        "rag": ["retrieval augmented generation"],
        "vector db": ["vectordb"],
        // Product/Design
        "ux": ["user experience"],
        "ui": ["user interface"],
        "cx": ["customer experience"],
        "wireframe": ["wireframing"],
        "prototype": ["prototyping"],
        "a/b testing": ["ab testing","split testing"],
        "figma": ["design system"],
        // Marketing/Sales
        "seo": ["search engine optimization"],
        "sem": ["search engine marketing"],
        "ppc": ["pay per click"],
        "cro": ["conversion rate optimization"],
        "ctr": ["click through rate"],
        "cpc": ["cost per click"],
        "crm": ["customer relationship management"],
        "abm": ["account based marketing"],
        // Finance
        "p&l": ["profit and loss"],
        "fp&a": ["financial planning and analysis"],
        "erp": ["enterprise resource planning"],
        "gaap": ["generally accepted accounting principles"],
        "ifrs": ["international financial reporting standards"],
        "dcf": ["discounted cash flow"],
        "npv": ["net present value"],
        "irr": ["internal rate of return"],
        // Healthcare
        "ehr": ["electronic health record"],
        "emr": ["electronic medical record"],
        "hipaa": ["health insurance portability and accountability act"],
        "icd-10": ["icd10"],
        "telehealth": ["telemedicine"],
        // HR/Operations
        "hris": ["human resource information system"],
        "ats": ["applicant tracking system"],
        "okr": ["objectives and key results"],
        "kpi": ["key performance indicator"],
        "sop": ["standard operating procedure"],
        "lean": ["lean manufacturing"],
        "six sigma": ["6 sigma","six-sigma"],
        "dmaic": ["define measure analyze improve control"],
        "iso": ["international organization for standardization"],
        "osha": ["occupational safety and health administration"],
        "wms": ["warehouse management system"],
        // Manufacturing/Engineering
        "cad": ["computer aided design"],
        "cam": ["computer aided manufacturing"],
        "cnc": ["computer numerical control"],
        "plc": ["programmable logic controller"],
        "hvac": ["heating ventilation air conditioning"],
        "rf": ["radio frequency"],
        "pcb": ["printed circuit board"],
        "bom": ["bill of materials"],
        // Support/Service
        "csat": ["customer satisfaction"],
        "nps": ["net promoter score"],
        "sla": ["service level agreement"],
        "helpdesk": ["service desk"],
      };
      const key = s;
      const out = new Set<string>([key]);
      Object.keys(a).forEach((k) => {
        if (key.includes(k)) a[k].forEach((v) => out.add(key.replace(k, v)));
      });
      // Generic hyphen/dot variations
      if (key.includes(".js")) out.add(key.replace(".js", "js"));
      if (key.includes("-")) out.add(key.replace(/-/g, " "));
      if (key.includes("/")) out.add(key.replace(/\//g, " "));
      return Array.from(out);
    };
    const tokenAliases = (t: string) => {
      const a: Record<string, string[]> = {
        // Tech
        "js": ["javascript"],
        "ts": ["typescript"],
        "aws": ["amazon","aws"],
        "gcp": ["google","cloud"],
        "azure": ["microsoft","azure"],
        "ci/cd": ["ci","cd"],
        "oop": ["object","oriented"],
        "nlp": ["natural","language"],
        "ml": ["machine","learning"],
        "ai": ["artificial","intelligence"],
        "dl": ["deep","learning"],
        "cv": ["computer","vision"],
        "k8s": ["kubernetes"],
        "dbt": ["data","build","tool"],
        "etl": ["extract","transform","load"],
        "elt": ["extract","load","transform"],
        "llm": ["large","language","model"],
        "rag": ["retrieval","augmented","generation"],
        // Product/Design
        "ux": ["user","experience"],
        "ui": ["user","interface"],
        "cx": ["customer","experience"],
        // Marketing/Sales
        "seo": ["search","engine","optimization"],
        "sem": ["search","engine","marketing"],
        "ppc": ["pay","per","click"],
        "cro": ["conversion","rate","optimization"],
        "crm": ["customer","relationship","management"],
        "abm": ["account","based","marketing"],
        // Finance
        "p&l": ["profit","loss"],
        "fp&a": ["financial","planning","analysis"],
        "erp": ["enterprise","resource","planning"],
        "dcf": ["discounted","cash","flow"],
        "npv": ["net","present","value"],
        "irr": ["internal","rate","return"],
        // Healthcare
        "ehr": ["electronic","health","record"],
        "emr": ["electronic","medical","record"],
        "hipaa": ["health","insurance","portability","accountability","act"],
        "icd-10": ["icd10"],
        // HR/Operations
        "hris": ["human","resource","information","system"],
        "ats": ["applicant","tracking","system"],
        "okr": ["objectives","key","results"],
        "kpi": ["key","performance","indicator"],
        "sop": ["standard","operating","procedure"],
        "dmaic": ["define","measure","analyze","improve","control"],
        "iso": ["international","organization","standardization"],
        "osha": ["occupational","safety","health","administration"],
        "wms": ["warehouse","management","system"],
        // Engineering
        "cad": ["computer","aided","design"],
        "cam": ["computer","aided","manufacturing"],
        "cnc": ["computer","numerical","control"],
        "plc": ["programmable","logic","controller"],
        "hvac": ["heating","ventilation","air","conditioning"],
        "rf": ["radio","frequency"],
        "pcb": ["printed","circuit","board"],
        "bom": ["bill","materials"],
        // Support
        "csat": ["customer","satisfaction"],
        "nps": ["net","promoter","score"],
        "sla": ["service","level","agreement"],
      };
      const out = new Set<string>([t]);
      (a[t] || []).forEach((v) => out.add(v));
      return Array.from(out);
    };

    const compute = (mode: "flex" | "phrase") => {
      const present: string[] = [];
      const missing: string[] = [];
      const locations: Record<string, string[]> = {};
      for (const k of keywords) {
        const nk = normalize(String(k));
        if (!nk) continue;
        const aliasP = phraseAliases(nk);
        if (mode === "phrase") {
          const hitSrc: string[] = [];
          Object.keys(sourceTexts).forEach((src) => {
            if (aliasP.some((p) => sourceTexts[src].includes(p))) hitSrc.push(src);
          });
          if (hitSrc.length) {
            present.push(String(k));
            locations[String(k)] = Array.from(new Set(hitSrc));
          } else {
            missing.push(String(k));
          }
          continue;
        }
        const tokens = nk.split(" ").filter((t) => t.length > 1 && !stop.has(t));
        const required = tokens.length <= 2 ? 1 : Math.ceil(tokens.length * 0.5);
        let hit = 0;
        const hitSrcSet = new Set<string>();
        for (const t of tokens) {
          const tv = Array.from(new Set([...variant(t), ...tokenAliases(t)]));
          for (const v of tv) {
            if (corpusVariants.has(v) || corpus.includes(v)) {
              hit++;
              break;
            }
            Object.keys(sourceVariants).forEach((src) => {
              if (sourceVariants[src].has(v) || sourceTexts[src].includes(v)) hitSrcSet.add(src);
            });
          }
        }
        if (corpus.includes(nk) || hit >= required) {
          present.push(String(k));
          const unionSrc = new Set<string>(locations[String(k)] || []);
          hitSrcSet.forEach((s) => unionSrc.add(s));
          locations[String(k)] = Array.from(unionSrc);
        } else {
          missing.push(String(k));
        }
      }
      const score = keywords.length ? Math.round((present.length / keywords.length) * 100) : 0;
      return {
        ...parsed,
        keywords,
        matchingSkills: present,
        missingSkills: missing.length ? missing : parsed?.missingSkills || [],
        matchScore: typeof parsed?.matchScore === "number" ? parsed.matchScore : score,
        matchLocations: locations,
      };
    };

    const finalFlex = compute("flex");
    const finalPhrase = compute("phrase");

    const unionMatching = Array.from(new Set([...(finalPhrase.matchingSkills || []), ...(finalFlex.matchingSkills || [])]));
    const flexOnly = (finalFlex.matchingSkills || []).filter((k: string) => !(finalPhrase.matchingSkills || []).includes(k));
    const missingUnion = (finalFlex.missingSkills || []).filter((k: string) => !unionMatching.includes(k));

    const WEIGHT_PHRASE = 1.0;
    const WEIGHT_FLEX = 0.6;
    let sum = 0;
    for (const k of keywords) {
      let w = 0;
      const locs = (finalPhrase.matchLocations || {})[k] || (finalFlex.matchLocations || {})[k] || [];
      let srcWeight = 0;
      for (const s of locs) srcWeight = Math.max(srcWeight, SOURCE_WEIGHTS[s] || 0);
      if ((finalPhrase.matchingSkills || []).includes(k)) w = WEIGHT_PHRASE * (srcWeight || 1);
      else if ((finalFlex.matchingSkills || []).includes(k)) w = WEIGHT_FLEX * (srcWeight || 1);
      sum += w;
    }
    const weightedScore = keywords.length ? Math.round((sum / keywords.length) * 100) : 0;

    const combined = {
      keywords,
      matchingSkills: unionMatching,
      matchingExactSkills: finalPhrase.matchingSkills || [],
      matchingFlexSkills: flexOnly,
      missingSkills: missingUnion,
      matchLocations: { ...(finalPhrase.matchLocations || {}), ...(finalFlex.matchLocations || {}) },
      matchScore: weightedScore,
      feedback: parsed?.feedback,
      raw: text,
    };

    return NextResponse.json({ result: combined });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
