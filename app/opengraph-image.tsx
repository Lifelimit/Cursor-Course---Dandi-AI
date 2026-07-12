import { ImageResponse } from "next/og";

export const alt = "Dandi AI repository intelligence";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", padding: 80, color: "white", background: "linear-gradient(135deg, #020617 0%, #071923 55%, #064e3b 140%)" }}>
      <div style={{ display: "flex", fontSize: 26, letterSpacing: 8, textTransform: "uppercase", color: "#6ee7b7" }}>Dandi AI</div>
      <div style={{ display: "flex", maxWidth: 900, marginTop: 28, fontSize: 70, lineHeight: 1.05, fontWeight: 700 }}>Repository context you can inspect.</div>
      <div style={{ display: "flex", maxWidth: 860, marginTop: 30, fontSize: 30, lineHeight: 1.35, color: "#cbd5e1" }}>README-grounded summaries and source-backed questions over prepared public repositories.</div>
    </div>,
    size,
  );
}
