/** Simulator proofs are permitted only for non-production integration work. */
export function simulatedProofsAllowed(environment = process.env.NODE_ENV): boolean {
  return environment !== "production";
}
