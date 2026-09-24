export function publicAppUrl(request?: Request) {
  if (process.env.NODE_ENV === "production") {
    return "https://www.getresolvex.com";
  }
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (configured) return configured.replace(/\/$/, "");
  if (request) return new URL(request.url).origin;
  return "http://127.0.0.1:3000";
}
