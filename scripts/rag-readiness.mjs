#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import { createClient } from "@supabase/supabase-js";

function loadLocalEnv() {
  const path = ".env.local";
  if (!fs.existsSync(path)) return;
  for (const line of fs.readFileSync(path, "utf8").split("\n")) {
    const match = line.trim().match(/^([A-Z0-9_]+)=(.*)$/);
    if (!match || process.env[match[1]]) continue;
    process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, "");
  }
}

const timeout = (ms) => AbortSignal.timeout(ms);
const required = ["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "UPSTASH_REDIS_REST_URL", "UPSTASH_REDIS_REST_TOKEN"];
const failures = [];
const mutate = process.argv.includes("--mutate");
const report = (name, ok, detail = "") => {
  console.log(`${ok ? "PASS" : "FAIL"} ${name}${detail ? ` — ${detail}` : ""}`);
  if (!ok) failures.push(name);
};

loadLocalEnv();
for (const name of required) report(`environment ${name}`, Boolean(process.env[name]), process.env[name] ? "configured" : "missing");
const hasGoogleKey = Boolean(process.env.GOOGLE_API_KEYS || process.env.GOOGLE_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY);
report("environment GOOGLE_API_KEYS / GOOGLE_API_KEY", hasGoogleKey, hasGoogleKey ? "configured" : "missing");

const model = (process.env.GOOGLE_EMBEDDING_MODEL || "gemini-embedding-001").replace(/^models\//, "");
let queryEmbedding;
if (process.env.GOOGLE_API_KEYS || process.env.GOOGLE_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
  try {
    const key = (process.env.GOOGLE_API_KEYS || process.env.GOOGLE_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY).split(",")[0].trim();
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:embedContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify({ model: `models/${model}`, content: { parts: [{ text: "Dandi RAG readiness probe" }] }, embedContentConfig: { outputDimensionality: 768 }, outputDimensionality: 768 }),
      signal: timeout(30_000),
    });
    const body = await response.json().catch(() => ({}));
    queryEmbedding = body.embedding?.values;
    report("Gemini embedding endpoint", response.ok && Array.isArray(queryEmbedding) && queryEmbedding.length === 768 && queryEmbedding.every((value) => Number.isFinite(value)), response.ok ? `${model}, 768 dimensions` : `HTTP ${response.status}`);
  } catch (error) {
    report("Gemini embedding endpoint", false, error instanceof Error && error.name === "TimeoutError" ? "timeout" : "network/provider error");
  }
}

const supabaseReady = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
const supabase = supabaseReady ? createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } }) : null;
if (supabase) {
  for (const table of ["ingestion_jobs", "repository_chunks", "repository_index_versions"]) {
    const { error } = await supabase.from(table).select("id", { head: true, count: "exact" }).limit(1);
    report(`Supabase table ${table}`, !error, error ? "missing or inaccessible; apply latest migrations" : "reachable");
  }
  const { error } = await supabase.rpc("match_repository_chunks", { query_embedding: queryEmbedding || Array(768).fill(0), match_threshold: 0, match_count: 1, p_repo_url: "https://github.com/dandi-readiness/probe", p_user_id: "diagnostic-probe", p_embedding_model: model });
  report("Supabase retrieval RPC", !error, error ? "missing or incompatible match_repository_chunks RPC" : "reachable");
}

async function redisCommand(command) {
  const response = await fetch(process.env.UPSTASH_REDIS_REST_URL, { method: "POST", headers: { Authorization: `Bearer ${process.env.UPSTASH_REDIS_REST_TOKEN}`, "Content-Type": "application/json" }, body: JSON.stringify(command), signal: timeout(10_000) });
  return response.ok;
}

if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
  const key = `dandi:rag-readiness:${crypto.randomUUID()}`;
  const token = crypto.randomUUID();
  try {
    const acquired = await redisCommand(["SET", key, token, "NX", "EX", "30"]);
    const refreshed = acquired && await redisCommand(["EVAL", "if redis.call('GET', KEYS[1]) == ARGV[1] then return redis.call('EXPIRE', KEYS[1], ARGV[2]) else return 0 end", "1", key, token, "30"]);
    const released = refreshed && await redisCommand(["EVAL", "if redis.call('GET', KEYS[1]) == ARGV[1] then return redis.call('DEL', KEYS[1]) else return 0 end", "1", key, token]);
    report("Redis owned lock lifecycle", Boolean(acquired && refreshed && released), "acquire, owner-checked refresh, owner-checked release");
  } catch {
    report("Redis owned lock lifecycle", false, "unreachable or command rejected");
  }
}

if (mutate && supabase && Array.isArray(queryEmbedding) && queryEmbedding.length === 768) {
  const probeId = crypto.randomUUID();
  const repoUrl = `https://github.com/dandi-readiness/${probeId}`;
  let versionId;
  try {
    const version = await supabase.from("repository_index_versions").insert({ user_id: "diagnostic-probe", repo_url: repoUrl, embedding_model: model, status: "building" }).select("id").single();
    if (version.error) throw version.error;
    versionId = version.data.id;
    const chunk = await supabase.from("repository_chunks").insert({ user_id: "diagnostic-probe", repo_url: repoUrl, index_version: versionId, embedding_model: model, file_path: "README.md", chunk_index: 0, content_hash: probeId, content: "Dandi RAG readiness probe", embedding: queryEmbedding });
    if (chunk.error) throw chunk.error;
    const activated = await supabase.rpc("activate_repository_index", { p_version_id: versionId, p_user_id: "diagnostic-probe", p_repo_url: repoUrl });
    if (activated.error) throw activated.error;
    const retrieved = await supabase.rpc("match_repository_chunks", { query_embedding: queryEmbedding, match_threshold: 0, match_count: 1, p_repo_url: repoUrl, p_user_id: "diagnostic-probe", p_embedding_model: model });
    report("RAG insert → activate → retrieve", !retrieved.error && retrieved.data?.length === 1, retrieved.error ? "RPC failed" : "one probe chunk retrieved");
  } catch {
    report("RAG insert → activate → retrieve", false, "schema, vector dimension, or RPC activation failed");
  } finally {
    if (versionId) {
      await supabase.from("repository_chunks").delete().eq("index_version", versionId);
      await supabase.from("repository_index_versions").delete().eq("id", versionId);
    }
  }
} else if (mutate) {
  report("RAG insert → activate → retrieve", false, "requires provider embedding and Supabase configuration");
}

console.log(mutate ? "Mutation probe completed and cleaned up." : "Read-only checks completed. Use --mutate for the temporary insert/retrieve/cleanup probe.");
if (failures.length) process.exitCode = 1;
