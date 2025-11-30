import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
    const session = await getServerSession(authOptions);

    return NextResponse.json({
        session,
        hasSession: !!session,
        hasUser: !!session?.user,
        hasId: !!session?.user?.id,
        userId: session?.user?.id || null
    });
}
