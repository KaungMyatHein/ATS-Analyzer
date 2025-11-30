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

    const body = await req.json();
    const { field, context, resume } = body || {};
    if (!field) {
      return NextResponse.json({ error: "Missing field" }, { status: 400 });
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
      "You are a resume assistant.",
      "Given the target field and the user's current resume JSON context, suggest concise, high-quality content.",
      "Output strictly JSON. For single-line fields use {\"text\": string}. For bullet lists use {\"bullets\": string[]}. No markdown fences.",
      `Field: ${field}`,
      "Context:",
      JSON.stringify({ context, resume }),
    ].join("\n\n");

    const bodyReq = {
      contents: [
        {
          role: "user",
          parts: [{ text: prompt }],
        },
      ],
      generationConfig: { temperature: 0.2 },
    };

    const resp = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(bodyReq),
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

    let json: any = {};
    try {
      json = JSON.parse(clean(text));
    } catch {
      json = { raw: text };
    }

    return NextResponse.json({ suggestion: json });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}

