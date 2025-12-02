/*
  One-off migration from old SQLite (prisma/dev.db) to Postgres (DATABASE_URL).
  Usage:
    1) Ensure `DATABASE_URL` is set (e.g., in .env.local)
    2) Run: `npm run migrate:old-db`
*/

const { PrismaClient } = require('@prisma/client');

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error('Missing DATABASE_URL env. Set it and re-run.');
    process.exit(1);
  }

  const source = new PrismaClient({ datasources: { db: { url: 'file:prisma/dev.db' } } });
  const target = new PrismaClient();

  try {
    console.log('[migrate] Reading users from SQLite...');
    const users = await source.user.findMany();
    console.log(`[migrate] Found ${users.length} users`);

    for (const u of users) {
      const data = {
        id: u.id,
        email: u.email,
        name: u.name || null,
        passwordHash: u.passwordHash,
        geminiApiKey: u.geminiApiKey || null,
        createdAt: u.createdAt,
      };
      await target.user.upsert({
        where: { email: u.email },
        update: { name: data.name, geminiApiKey: data.geminiApiKey },
        create: data,
      });
    }

    console.log('[migrate] Reading resumes from SQLite...');
    const resumes = await source.resume.findMany();
    console.log(`[migrate] Found ${resumes.length} resumes`);

    for (const r of resumes) {
      const data = {
        id: r.id,
        userId: r.userId,
        name: r.name,
        data: r.data,
        settings: r.settings,
        createdAt: r.createdAt,
      };
      await target.resume.upsert({
        where: { id: r.id },
        update: { name: data.name, data: data.data, settings: data.settings },
        create: data,
      });
    }

    let savedJobs = [];
    try {
      savedJobs = await source.savedJob.findMany();
      console.log(`[migrate] Found ${savedJobs.length} saved jobs`);
    } catch (e) {
      console.log('[migrate] No saved_jobs table in source; skipping.');
    }

    for (const s of savedJobs) {
      const data = {
        id: s.id,
        userId: s.userId,
        company: s.company,
        position: s.position,
        link: s.link || null,
        jd: s.jd,
        result: s.result,
        matchScore: s.matchScore || null,
        matchScoreFlex: s.matchScoreFlex || null,
        matchScorePhrase: s.matchScorePhrase || null,
        status: s.status || 'pending',
        variantResumeId: s.variantResumeId || null,
        appliedAt: s.appliedAt || null,
        createdAt: s.createdAt,
      };
      await target.savedJob.upsert({
        where: { id: s.id },
        update: {
          company: data.company,
          position: data.position,
          link: data.link,
          jd: data.jd,
          result: data.result,
          matchScore: data.matchScore,
          matchScoreFlex: data.matchScoreFlex,
          matchScorePhrase: data.matchScorePhrase,
          status: data.status,
          variantResumeId: data.variantResumeId,
          appliedAt: data.appliedAt,
        },
        create: data,
      });
    }

    console.log('[migrate] Done');
  } finally {
    await source.$disconnect();
    await target.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
