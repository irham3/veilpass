import { ImageResponse } from "next/og";

import { siteConfig } from "@/lib/seo";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = siteConfig.ogImageAlt;

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          alignItems: "stretch",
          background:
            "radial-gradient(circle at 70% 20%, rgba(185,245,208,0.24), transparent 34%), linear-gradient(135deg, #0B0F0E 0%, #111816 52%, #050706 100%)",
          color: "#F5F2E9",
          display: "flex",
          fontFamily: "Arial, Helvetica, sans-serif",
          height: "100%",
          overflow: "hidden",
          padding: 72,
          position: "relative",
          width: "100%",
        }}
      >
        <div
          style={{
            border: "1px solid rgba(245,242,233,0.14)",
            borderRadius: 42,
            display: "flex",
            flex: 1,
            overflow: "hidden",
            position: "relative",
          }}
        >
          <div
            style={{
              background:
                "linear-gradient(90deg, rgba(185,245,208,0.16), transparent 38%), rgba(245,242,233,0.045)",
              borderRight: "1px solid rgba(245,242,233,0.12)",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              padding: 54,
              width: "58%",
            }}
          >
            <div
              style={{
                alignItems: "center",
                color: "#B9F5D0",
                display: "flex",
                fontSize: 26,
                fontWeight: 700,
                gap: 14,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
              }}
            >
              <div
                style={{
                  background: "#B9F5D0",
                  borderRadius: 999,
                  height: 14,
                  width: 14,
                }}
              />
              VeilPass
            </div>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div
                style={{
                  fontSize: 76,
                  fontWeight: 800,
                  letterSpacing: "-0.07em",
                  lineHeight: 0.9,
                  maxWidth: 620,
                }}
              >
                Prove access. Keep wallets private.
              </div>
              <div
                style={{
                  color: "rgba(245,242,233,0.74)",
                  fontSize: 30,
                  lineHeight: 1.35,
                  marginTop: 30,
                  maxWidth: 650,
                }}
              >
                Stellar testnet login where hosts get a scoped ID and verdict, not the wallet address.
              </div>
            </div>
            <div
              style={{
                color: "rgba(245,242,233,0.64)",
                display: "flex",
                fontSize: 22,
                gap: 16,
              }}
            >
              <span>Freighter</span>
              <span>·</span>
              <span>Origin-scoped ID</span>
              <span>·</span>
              <span>Soroban gate</span>
            </div>
          </div>

          <div
            style={{
              alignItems: "center",
              display: "flex",
              justifyContent: "center",
              padding: 50,
              width: "42%",
            }}
          >
            <div
              style={{
                background: "rgba(5,7,6,0.72)",
                border: "1px solid rgba(185,245,208,0.26)",
                borderRadius: 34,
                boxShadow: "0 40px 120px rgba(0,0,0,0.4)",
                display: "flex",
                flexDirection: "column",
                gap: 18,
                padding: 32,
                width: "100%",
              }}
            >
              {[
                ["walletAddress", "withheld"],
                ["privateAppId", "vp_appA_72f1"],
                ["origin", "https://app.example"],
                ["verdict", "eligible"],
              ].map(([label, value]) => (
                <div
                  key={label}
                  style={{
                    background: "rgba(245,242,233,0.055)",
                    border: "1px solid rgba(245,242,233,0.1)",
                    borderRadius: 22,
                    display: "flex",
                    flexDirection: "column",
                    gap: 8,
                    padding: "18px 20px",
                  }}
                >
                  <div style={{ color: "rgba(245,242,233,0.55)", fontSize: 19 }}>
                    {label}
                  </div>
                  <div
                    style={{
                      color: value === "withheld" ? "#B9F5D0" : "#F5F2E9",
                      fontFamily: "monospace",
                      fontSize: 27,
                      fontWeight: 700,
                    }}
                  >
                    {value}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    ),
    size,
  );
}
