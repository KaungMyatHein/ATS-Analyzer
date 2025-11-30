import { NextRequest, NextResponse } from "next/server";
import { prisma } from "lib/prisma";

export async function POST(req: NextRequest) {
    try {
        const { email, name, passwordHash } = await req.json();

        if (!email || !passwordHash) {
            return NextResponse.json(
                { error: "Email and password are required" },
                { status: 400 }
            );
        }

        // Check if user already exists
        const existingUser = await prisma.user.findUnique({
            where: { email },
        });

        if (existingUser) {
            return NextResponse.json(
                { error: "Email already exists" },
                { status: 400 }
            );
        }

        // Create user
        const user = await prisma.user.create({
            data: {
                email,
                name,
                passwordHash,
            },
        });

        return NextResponse.json(
            { success: true, userId: user.id },
            { status: 201 }
        );
    } catch (error: any) {
        console.error("[API] Error creating user:", error);
        return NextResponse.json(
            { error: error.message || "Internal Server Error" },
            { status: 500 }
        );
    }
}
