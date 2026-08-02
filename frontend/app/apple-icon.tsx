import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    <div
      style={{
        alignItems: "center",
        background: "#0B0F0E",
        display: "flex",
        height: "100%",
        justifyContent: "center",
        position: "relative",
        width: "100%",
      }}
    >
      <div style={{ color: "#F5F2E9", display: "flex", fontSize: 108, fontWeight: 700, letterSpacing: 0 }}>V</div>
      <div style={{ background: "#B9F5D0", height: 54, position: "absolute", top: 69, width: 12 }} />
    </div>,
    size,
  );
}
