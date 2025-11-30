import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";
import { prisma } from "lib/prisma";

// GET /api/resumes - List all resumes for authenticated user
export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const resumes = await prisma.resume.findMany({
            where: { userId: session.user.id },
            orderBy: { updatedAt: "desc" },
        });

        console.log("[API] GET /api/resumes - userId:", session.user.id, "count:", resumes.length);

        return NextResponse.json({ resumes });
    } catch (error: any) {
        console.error("[API] Error fetching resumes:", error);
        return NextResponse.json(
            { error: error.message || "Internal Server Error" },
            { status: 500 }
        );
    }
}

// POST /api/resumes - Create new resume
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
        const { name, data, settings } = body;

        const resume = await prisma.resume.create({
            data: {
                userId: session.user.id,
                name: name || "Untitled Resume",
                data: JSON.stringify(data || {}),
                settings: JSON.stringify(settings || {}),
            },
        });

        console.log("[API] POST /api/resumes - created id:", resume.id);

        return NextResponse.json({ resume }, { status: 201 });
    } catch (error: any) {
        console.error("[API] Error creating resume:", error);
        return NextResponse.json(
            { error: error.message || "Internal Server Error" },
            { status: 500 }
        );
    }
}
