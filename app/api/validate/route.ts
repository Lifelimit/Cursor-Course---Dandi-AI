import { NextResponse } from "next/server";
import { validateApiKey } from "@/lib/services/api-key.service";

export async function POST(request: Request) {
  try {
    const { key } = await request.json();

    if (!key) {
      return NextResponse.json({ error: "API key is required" }, { status: 400 });
    }

    try {
      const keyData = await validateApiKey(key);
      return NextResponse.json({ valid: true, name: keyData.name });
    } catch {
      return NextResponse.json({ error: "Invalid API Key" }, { status: 401 });
    }
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
