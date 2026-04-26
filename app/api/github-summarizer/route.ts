import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function POST(request: Request) {
  try {
    // 1. Extract the API key from the custom Header
    const apiKey = request.headers.get("x-api-key");

    if (!apiKey) {
      return NextResponse.json(
        { error: "API key is required in headers (x-api-key)" },
        { status: 401 }
      );
    }

    // 2. Validate the key against your Supabase database
    const { data: keyData, error: keyError } = await supabaseAdmin
      .from("api_keys")
      .select("id, name, usage_count")
      .eq("key_value", apiKey)
      .single();

    if (keyError || !keyData) {
      return NextResponse.json({ error: "Invalid API key" }, { status: 403 });
    }

    // 3. Extract the GitHub URL from the JSON body
    const { githubUrl } = await request.json();

    if (!githubUrl) {
      return NextResponse.json({ error: "githubUrl is required in body" }, { status: 400 });
    }

    // 4. Increment the usage count for this key in the database
    await supabaseAdmin
      .from("api_keys")
      .update({ usage_count: (keyData.usage_count || 0) + 1 })
      .eq("id", keyData.id);

    // 5. Placeholder for Summarization Logic
    // This is where you will eventually use LangChain and OpenAI.
    // For now, we'll return a success message to verify everything is working.
    const message = `Successfully validated key for ${keyData.name}. Summarizing repo: ${githubUrl}`;

    return NextResponse.json({
      success: true,
      message,
      data: {
        owner: keyData.name,
        repo: githubUrl,
      },
    });
  } catch (err) {
    console.error("API Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
