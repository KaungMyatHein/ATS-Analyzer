import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import { prisma } from "lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        console.log("GET /api/settings/gemini-key - Session:", JSON.stringify(session, null, 2));

        if (!session?.user?.id) {
            console.log("Unauthorized - session:", session);
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        console.log("Fetching user with ID:", session.user.id);

        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: { geminiApiKey: true },
        });

        console.log("User found:", user);

        return NextResponse.json({ apiKey: user?.geminiApiKey || "" });
    } catch (error: any) {
        console.error("Error in GET /api/settings/gemini-key:", error);
        console.error("Error stack:", error.stack);
        return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions);

    console.log("POST /api/settings/gemini-key - Session:", JSON.stringify(session, null, 2));

    if (!session?.user?.id) {
        console.log("Unauthorized - session:", session);
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const { apiKey } = await req.json();

        await prisma.user.update({
            where: { id: session.user.id },
            data: { geminiApiKey: apiKey },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error updating API key:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
