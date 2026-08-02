import { ImageResponse } from "next/og";

import { siteConfig } from "@/lib/seo";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = siteConfig.ogImageAlt;

const payloadRows = [
  ["wallet", "withheld"],
  ["privateAppId", "vp_appA_72f1"],
  ["origin", "app.example"],
  ["verdict", "eligible"],
] as const;

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          background:
            "radial-gradient(circle at 12% 18%, rgba(185,245,208,0.22), transparent 29%), radial-gradient(circle at 82% 30%, rgba(185,245,208,0.18), transparent 31%), linear-gradient(135deg, #050706 0%, #0B0F0E 44%, #111816 100%)",
          color: "#F5F2E9",
          display: "flex",
          fontFamily: "Arial, Helvetica, sans-serif",
          height: "100%",
          overflow: "hidden",
          padding: 58,
          position: "relative",
          width: "100%",
        }}
      >
        <div
          style={{
            border: "1px solid rgba(245,242,233,0.13)",
            borderRadius: 46,
            display: "flex",
            flex: 1,
            overflow: "hidden",
            position: "relative",
          }}
        >
          <div
            style={{
              background:
                "linear-gradient(120deg, rgba(245,242,233,0.055), rgba(245,242,233,0.018)), rgba(5,7,6,0.72)",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              padding: "48px 52px",
              position: "relative",
              width: "47%",
            }}
          >
            <div
              style={{
                border: "1px solid rgba(185,245,208,0.24)",
                borderRadius: 34,
                display: "flex",
                height: 148,
                overflow: "hidden",
                position: "relative",
                width: 148,
              }}
            >
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
                <div
                  style={{
                    color: "#F5F2E9",
                    display: "flex",
                    fontSize: 102,
                    fontWeight: 900,
                    letterSpacing: "-0.12em",
                    lineHeight: 1,
                    transform: "translateX(-3px)",
                  }}
                >
                  V
                </div>
                <div
                  style={{
                    background: "#B9F5D0",
                    borderRadius: 999,
                    height: 62,
                    position: "absolute",
                    top: 44,
                    width: 13,
                  }}
                />
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column" }}>
              <div
                style={{
                  color: "#B9F5D0",
                  display: "flex",
                  fontSize: 24,
                  fontWeight: 800,
                  letterSpacing: "0.16em",
                  marginBottom: 26,
                  textTransform: "uppercase",
                }}
              >
                VeilPass
              </div>
              <div
                style={{
                  display: "flex",
                  fontSize: 73,
                  fontWeight: 900,
                  letterSpacing: "-0.075em",
                  lineHeight: 0.88,
                  maxWidth: 520,
                }}
              >
                Prove access. Keep wallets private.
              </div>
            </div>
          </div>

          <div
            style={{
              borderLeft: "1px solid rgba(245,242,233,0.1)",
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              padding: "48px 52px",
              width: "53%",
            }}
          >
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 8,
                marginBottom: 28,
              }}
            >
              <div
                style={{
                  color: "#F5F2E9",
                  display: "flex",
                  fontSize: 31,
                  fontWeight: 700,
                  letterSpacing: "-0.035em",
                }}
              >
                Stellar testnet login.
              </div>
              <div
                style={{
                  color: "rgba(245,242,233,0.72)",
                  display: "flex",
                  fontSize: 27,
                  letterSpacing: "-0.02em",
                }}
              >
                Scoped ID and verdict only.
              </div>
              <div
                style={{
                  color: "#B9F5D0",
                  display: "flex",
                fontSize: 30,
                  fontWeight: 800,
                  letterSpacing: "-0.03em",
                }}
              >
                Wallet address stays withheld.
              </div>
            </div>

            <div
              style={{
                background:
                  "radial-gradient(circle at 82% 8%, rgba(185,245,208,0.16), transparent 36%), rgba(5,7,6,0.76)",
                border: "1px solid rgba(185,245,208,0.24)",
                borderRadius: 34,
                boxShadow: "0 34px 100px rgba(0,0,0,0.46)",
                display: "flex",
                flexDirection: "column",
                gap: 12,
                padding: 24,
                width: "100%",
              }}
            >
              <div
                style={{
                  color: "rgba(245,242,233,0.58)",
                  display: "flex",
                  fontSize: 18,
                  fontWeight: 700,
                  justifyContent: "space-between",
                  letterSpacing: "0.13em",
                  textTransform: "uppercase",
                }}
              >
                <span>Private aperture live</span>
                <span>Testnet</span>
              </div>

              {payloadRows.map(([label, value]) => (
                <div
                  key={label}
                  style={{
                    alignItems: "center",
                    background:
                      value === "withheld"
                        ? "rgba(185,245,208,0.12)"
                        : "rgba(245,242,233,0.052)",
                    border:
                      value === "withheld"
                        ? "1px solid rgba(185,245,208,0.24)"
                        : "1px solid rgba(245,242,233,0.09)",
                    borderRadius: 18,
                    display: "flex",
                    justifyContent: "space-between",
                    padding: "14px 18px",
                  }}
                >
                  <span style={{ color: "rgba(245,242,233,0.58)", display: "flex", fontSize: 20 }}>
                    {label}
                  </span>
                  <span
                    style={{
                      color: value === "withheld" ? "#B9F5D0" : "#F5F2E9",
                      display: "flex",
                      fontFamily: "monospace",
                      fontSize: 25,
                      fontWeight: 800,
                    }}
                  >
                    {value}
                  </span>
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
