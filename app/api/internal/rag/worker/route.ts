import { NextResponse } from "next/server";
import { processQueuedIngestionJobs } from "@/lib/services/ingestion-job.service";

export const runtime = "nodejs";
export const maxDuration = 55;

function isAuthorized(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  const workerSecret = process.env.RAG_WORKER_SECRET;
  return Boolean(
    (cronSecret && request.headers.get("authorization") === `Bearer ${cronSecret}`)
    || (workerSecret && request.headers.get("x-rag-worker-secret") === workerSecret)
    || (workerSecret && request.headers.get("authorization") === `Bearer ${workerSecret}`)
  );
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const results = await processQueuedIngestionJobs({ limit: 1 });
    return NextResponse.json({ ok: true, processed: results.map(({ job, outcome }) => ({ jobId: job.id, outcome, status: job.status, currentStep: job.current_step })) });
  } catch {
    console.error("RAG worker invocation failed.");
    return NextResponse.json({ error: "Worker invocation failed." }, { status: 503 });
  }
}

export async function POST(request: Request) {
  return GET(request);
}
