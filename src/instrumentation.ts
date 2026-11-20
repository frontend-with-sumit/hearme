/// Runs once when the Next.js server starts, so a missing or malformed secret
/// stops the boot instead of failing the first request that needs it. Node
/// only: env validation uses Buffer, which the Edge runtime lacks, and
/// NEXT_RUNTIME is the framework's own switch, not an app secret.
export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { getEnv } = await import("./shared/env");
    getEnv();
  }
}
