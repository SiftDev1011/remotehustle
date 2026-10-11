import "server-only";

export function requiredEnv(name: string) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Configuration is missing ${name}.`);
  return value;
}
export function supabaseConfigured() {
  return (
    !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
    !!process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  );
}
export function appUrl() {
  const url = new URL(requiredEnv("APP_URL"));
  if (
    url.username ||
    url.password ||
    !["https:", "http:"].includes(url.protocol)
  )
    throw new Error("APP_URL is invalid.");
  if (
    process.env.NODE_ENV === "production" &&
    url.protocol !== "https:" &&
    url.hostname !== "localhost"
  )
    throw new Error("Use HTTPS for APP_URL in production.");
  return url.origin;
}
