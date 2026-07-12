export type RagTreeFile = {
  path: string;
  size: number;
};

export const RAG_MAX_FILE_COUNT = 40;
export const RAG_MAX_FILE_SIZE_BYTES = 50_000;
const MAX_FILES_PER_FOLDER = 6;

const TEXT_EXTENSIONS = [
  ".js", ".jsx", ".ts", ".tsx", ".py", ".go", ".rs", ".java", ".c", ".cpp", ".h",
  ".md", ".txt", ".json", ".html", ".css", ".yaml", ".yml", ".toml", ".sh",
];

const CONFIG_FILE_PATTERNS = [
  /^package\.json$/i,
  /^next\.config\.(js|mjs|ts)$/i,
  /^tsconfig.*\.json$/i,
  /^tailwind\.config\.(js|mjs|ts)$/i,
  /^eslint\.config\.(js|mjs|ts)$/i,
  /^\.env\.example$/i,
  /^\.env\.sample$/i,
];

const LOCKFILES = new Set(["yarn.lock", "package-lock.json", "pnpm-lock.yaml"]);
const ASSET_EXTENSIONS = [
  ".svg", ".png", ".jpg", ".jpeg", ".gif", ".webp", ".ico", ".pdf", ".zip", ".gz",
  ".mp4", ".mov", ".woff", ".woff2", ".ttf",
];
const BUILD_SEGMENTS = new Set([
  "node_modules", ".next", "dist", "build", "out", ".git", "coverage", ".turbo",
]);
const GENERATED_MARKERS = [
  ".min.js",
  ".bundle.js",
  ".generated.",
  ".gen.",
  "generated/",
  "__generated__/",
];
const SENSITIVE_PATH_SEGMENTS = new Set([".aws", ".gnupg", ".ssh", "credentials", "secrets"]);
const SENSITIVE_FILE_PATTERNS = [
  /^\.env(?:\..+)?$/i,
  /^\.npmrc$/i,
  /^\.pypirc$/i,
  /^\.netrc$/i,
  /^id_(?:rsa|dsa|ecdsa|ed25519)(?:\.pub)?$/i,
  /^(?:auth|credentials?|secrets?|service[-_]?account|firebase[-_]?adminsdk)\.(?:json|ya?ml|toml|txt)$/i,
];

function extensionOf(path: string) {
  const fileName = path.split("/").pop() ?? path;
  const dotIndex = fileName.lastIndexOf(".");
  return dotIndex === -1 ? "" : fileName.slice(dotIndex).toLowerCase();
}

function topFolder(path: string) {
  return path.includes("/") ? path.split("/")[0] : ".";
}

function hasBuildSegment(path: string) {
  return path.split("/").some((segment) => BUILD_SEGMENTS.has(segment.toLowerCase()));
}

function looksSensitive(path: string, fileName: string) {
  const segments = path.split("/");
  return segments.some((segment) => SENSITIVE_PATH_SEGMENTS.has(segment))
    || SENSITIVE_FILE_PATTERNS.some((pattern) => pattern.test(fileName));
}

export function isEmbeddableRagFile(file: RagTreeFile) {
  const lower = file.path.toLowerCase();
  const fileName = lower.split("/").pop() ?? lower;

  if (file.size <= 0 || file.size > RAG_MAX_FILE_SIZE_BYTES) return false;
  if (hasBuildSegment(lower)) return false;
  if (looksSensitive(lower, fileName)) return false;
  if (LOCKFILES.has(fileName)) return false;
  if (GENERATED_MARKERS.some((marker) => lower.includes(marker))) return false;
  if (ASSET_EXTENSIONS.some((extension) => lower.endsWith(extension))) return false;
  if (!TEXT_EXTENSIONS.some((extension) => lower.endsWith(extension))) return false;
  if (lower.endsWith(".json") && file.size > 20_000 && fileName !== "package.json") return false;

  return true;
}

function scoreRagFile(file: RagTreeFile) {
  const lower = file.path.toLowerCase();
  const fileName = lower.split("/").pop() ?? lower;
  let score = 0;

  if (fileName === "readme.md") score += 1000;
  if (lower.startsWith("docs/") || lower.includes("/docs/")) score += 500;
  if (["app/", "src/", "lib/", "components/"].some((prefix) => lower.startsWith(prefix))) score += 450;
  if (lower.includes("/api/") || lower.startsWith("app/api/")) score += 425;
  if (CONFIG_FILE_PATTERNS.some((pattern) => pattern.test(fileName))) score += 700;
  if (lower.includes("test") || lower.includes("spec")) score += 120;
  if (lower.endsWith(".md")) score += 75;
  if ([".ts", ".tsx", ".js", ".jsx"].includes(extensionOf(lower))) score += 60;
  if (lower.endsWith(".json") && fileName !== "package.json") score -= 80;

  score -= Math.floor(file.size / 10_000);
  return score;
}

export function selectRagFiles(
  tree: RagTreeFile[],
  options: { maxFileCount?: number; maxFileSizeBytes?: number } = {}
) {
  const maxFileCount = options.maxFileCount ?? RAG_MAX_FILE_COUNT;
  const maxFileSizeBytes = options.maxFileSizeBytes ?? RAG_MAX_FILE_SIZE_BYTES;
  const folderCounts = new Map<string, number>();

  const candidates = tree
    .filter((file) => file.size <= maxFileSizeBytes && isEmbeddableRagFile(file))
    .map((file) => ({ file, score: scoreRagFile(file) }))
    .sort((a, b) => b.score - a.score || a.file.path.localeCompare(b.file.path));

  const selected: RagTreeFile[] = [];

  for (const candidate of candidates) {
    const folder = topFolder(candidate.file.path);
    const count = folderCounts.get(folder) ?? 0;
    if (count >= MAX_FILES_PER_FOLDER && selected.length < Math.floor(maxFileCount * 0.75)) {
      continue;
    }

    selected.push(candidate.file);
    folderCounts.set(folder, count + 1);
    if (selected.length >= maxFileCount) break;
  }

  if (selected.length < maxFileCount) {
    const selectedPaths = new Set(selected.map((file) => file.path));
    for (const candidate of candidates) {
      if (selectedPaths.has(candidate.file.path)) continue;
      selected.push(candidate.file);
      if (selected.length >= maxFileCount) break;
    }
  }

  return selected;
}
