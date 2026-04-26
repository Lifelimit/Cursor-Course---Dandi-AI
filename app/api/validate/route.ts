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
    } catch (validationError) {
      return NextResponse.json({ valid: false, error: "Invalid API key" }, { status: 404 });
    }
  } catch (err) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
