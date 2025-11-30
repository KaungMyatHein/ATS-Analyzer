import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import { prisma } from "lib/prisma";

// GET /api/resumes/[id] - Get specific resume
export async function GET(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const resume = await prisma.resume.findFirst({
            where: {
                id: params.id,
                userId: session.user.id,
            },
        });

        if (!resume) {
            return NextResponse.json({ error: "Resume not found" }, { status: 404 });
        }

        console.log("[API] GET /api/resumes/", params.id, "- userId:", session.user.id, "found:", !!resume);
        return NextResponse.json({ resume });
    } catch (error: any) {
        console.error("[API] Error fetching resume:", error);
        return NextResponse.json(
            { error: error.message || "Internal Server Error" },
            { status: 500 }
        );
    }
}

// PUT /api/resumes/[id] - Update resume
export async function PUT(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const { name, data, settings } = body;

        const resume = await prisma.resume.updateMany({
            where: {
                id: params.id,
                userId: session.user.id,
            },
            data: {
                name,
                data: JSON.stringify(data),
                settings: JSON.stringify(settings),
            },
        });

        if (resume.count === 0) {
            return NextResponse.json({ error: "Resume not found" }, { status: 404 });
        }

        const updatedResume = await prisma.resume.findUnique({
            where: { id: params.id },
        });
        console.log("[API] PUT /api/resumes/", params.id, "- userId:", session.user.id, "updated");
        return NextResponse.json({ resume: updatedResume });
    } catch (error: any) {
        console.error("[API] Error updating resume:", error);
        return NextResponse.json(
            { error: error.message || "Internal Server Error" },
            { status: 500 }
        );
    }
}

// DELETE /api/resumes/[id] - Delete resume
export async function DELETE(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const result = await prisma.resume.deleteMany({
            where: {
                id: params.id,
                userId: session.user.id,
            },
        });

        if (result.count === 0) {
            return NextResponse.json({ error: "Resume not found" }, { status: 404 });
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("[API] Error deleting resume:", error);
        return NextResponse.json(
            { error: error.message || "Internal Server Error" },
            { status: 500 }
        );
    }
}
