/**
 * Browser-safe entry points for the deployed VeilPass experience.
 *
 * These are deliberately public configuration values: they identify web
 * origins, never credentials. Keeping them in one place prevents the
 * marketing site, hosted login, and both host demos from drifting apart.
 */
function origin(value: string | undefined, fallback: string) {
  return (value || fallback).replace(/\/$/, "");
}

export const publicAppLinks = {
  home: origin(process.env.NEXT_PUBLIC_VEILPASS_HOME_ORIGIN, "https://veilpass.dev"),
  login: origin(process.env.NEXT_PUBLIC_VEILPASS_LOGIN_ORIGIN, "https://login.veilpass.dev"),
  appA: origin(process.env.NEXT_PUBLIC_VEILPASS_APP_A_ORIGIN, "https://app-a.veilpass.dev"),
  appB: origin(process.env.NEXT_PUBLIC_VEILPASS_APP_B_ORIGIN, "https://app-b.veilpass.dev"),
} as const;

export const enrollmentUrl = `${publicAppLinks.login}/dashboard/enroll`;
