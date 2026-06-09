import * as fs from "fs";
import * as path from "path";

const envPath = path.resolve(__dirname, "../.env.local");
console.log("Checking env file path:", envPath);
console.log("Exists?", fs.existsSync(envPath));

if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, "utf-8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#")) {
      const eqIdx = trimmed.indexOf("=");
      if (eqIdx !== -1) {
        const key = trimmed.slice(0, eqIdx).trim();
        let val = trimmed.slice(eqIdx + 1).trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1);
        }
        process.env[key] = val;
        console.log(`Set env: ${key} = ${val.slice(0, 15)}...`);
      }
    }
  }
}

console.log("NEXT_PUBLIC_SUPABASE_URL is:", process.env.NEXT_PUBLIC_SUPABASE_URL);
