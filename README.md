# ATS-Analyzer

ATS-Analyzer is a modern, ATS-aware resume builder and analyzer with AI-assisted editing, multi-industry keyword matching, and PDF highlight visualization.

## Features
- ATS scoring with industry-wide synonyms and phrase matching
- Exact vs flex matching and section weighting (Profile, Work, Education, Projects, Skills)
- Missing skills detection fixed with skill categories scanning and highlights
- PDF highlighting of matched skills (exact = green, flex = yellow)
- AI Suggest buttons for builder inputs (summary, work/education/project descriptions, skills)
- Saved Jobs with results history and re-analyze flow
- Settings for Gemini API key; authentication and dashboard

## Tech Stack
- TypeScript, React, Next.js 13, Tailwind CSS
- Redux Toolkit state management
- React-PDF for PDF generation; PDF.js for parsing
- Prisma + SQLite for local persistence
- NextAuth for authentication

## Pages
- `/` Home
- `/resume-builder` AI-assisted builder and live PDF preview
- `/ats-analyzer` ATS scoring and match trace
- `/saved-jobs` Saved analyses with match scores
- `/settings` Gemini API key management
- `/auth/signin`, `/auth/signup` Authentication
- `/dashboard` Overview and stats

## Local Development
- Clone: `git clone https://github.com/KaungMyatHein/ATS-Analyzer.git`
- Install: `npm install`
- Dev server: `npm run dev`
- Visit: `http://localhost:3000`
- Sign up or sign in, then open `/settings` to add your Gemini API key

Notes
- Prisma is configured for SQLite and works out-of-the-box; no extra setup needed for local dev.
- The analyzer uses your current resume (preview) with a DB fallback when reanalyzing saved jobs.
