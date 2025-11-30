import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import { prisma } from "lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const items = await prisma.savedJob.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
    });
    const mapped = items.map((it) => ({
      id: it.id,
      company: it.company,
      position: it.position,
      link: it.link || "",
      jd: it.jd,
      result: ((): any => { try { return JSON.parse(it.result || "{}"); } catch { return {}; } })(),
      matchScore: typeof it.matchScore === "number" ? it.matchScore : undefined,
      matchScoreFlex: typeof it.matchScoreFlex === "number" ? it.matchScoreFlex : undefined,
      matchScorePhrase: typeof it.matchScorePhrase === "number" ? it.matchScorePhrase : undefined,
      status: it.status || "pending",
      variantResumeId: it.variantResumeId || undefined,
      createdAt: it.createdAt.toISOString(),
    }));
    return NextResponse.json({ items: mapped });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const existingUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true },
    });
    if (!existingUser) {
      return NextResponse.json(
        { error: "User not found. Please sign out and sign in again." },
        { status: 401 }
      );
    }
    const body = await req.json();
    const { company, position, link, jd, result, status } = body || {};
    if (!company || !position || !jd || !result) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const created = await prisma.savedJob.create({
      data: {
        userId: session.user.id,
        company,
        position,
        link: link || null,
        jd,
        result: JSON.stringify(result || {}),
        matchScore: typeof result?.matchScore === "number" ? Math.round(result.matchScore) : (typeof result?.flex?.matchScore === "number" ? Math.round(result.flex.matchScore) : null),
        matchScoreFlex: typeof result?.flex?.matchScore === "number" ? Math.round(result.flex.matchScore) : null,
        matchScorePhrase: typeof result?.phrase?.matchScore === "number" ? Math.round(result.phrase.matchScore) : null,
        status: typeof status === "string" && status.trim() ? status.trim().toLowerCase() : undefined,
      },
    });

    return NextResponse.json({ item: {
      id: created.id,
      company: created.company,
      position: created.position,
      link: created.link || "",
      jd: created.jd,
      result,
      matchScore: created.matchScore ?? undefined,
      matchScoreFlex: created.matchScoreFlex ?? undefined,
      matchScorePhrase: created.matchScorePhrase ?? undefined,
      status: created.status || "pending",
      createdAt: created.createdAt.toISOString(),
    } }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    let id = req.nextUrl.searchParams.get("id");
    if (!id) {
      try {
        const body = await req.json();
        id = body?.id;
      } catch {}
    }
    if (!id) {
      return NextResponse.json({ error: "Missing id" }, { status: 400 });
    }

    const job = await prisma.savedJob.findFirst({
      where: { id, userId: session.user.id },
      select: { variantResumeId: true },
    });

    const del = await prisma.savedJob.deleteMany({
      where: { id, userId: session.user.id },
    });

    if (job?.variantResumeId) {
      const others = await prisma.savedJob.count({
        where: {
          userId: session.user.id,
          variantResumeId: job.variantResumeId,
          id: { not: id },
        },
      });
      if (others === 0) {
        await prisma.resume.deleteMany({
          where: { id: job.variantResumeId, userId: session.user.id },
        });
      }
    }

    return NextResponse.json({ success: true, deleted: del.count });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { id, variantResumeId, result, matchScore, matchScoreFlex, matchScorePhrase, status } = body || {};
    if (!id) {
      return NextResponse.json({ error: "Missing id" }, { status: 400 });
    }

    const data: any = {};
    if (typeof variantResumeId === "string") data.variantResumeId = variantResumeId;
    if (result) data.result = JSON.stringify(result);
    if (typeof matchScore === "number") data.matchScore = Math.round(matchScore);
    if (typeof matchScoreFlex === "number") data.matchScoreFlex = Math.round(matchScoreFlex);
    if (typeof matchScorePhrase === "number") data.matchScorePhrase = Math.round(matchScorePhrase);
    if (typeof status === "string") data.status = status.trim();

    const updated = await prisma.savedJob.updateMany({
      where: { id, userId: session.user.id },
      data,
    });
    if (updated.count === 0) {
      return NextResponse.json({ error: "Saved job not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
