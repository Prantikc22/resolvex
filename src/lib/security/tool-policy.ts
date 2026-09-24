const consequential = [
  "SEND",
  "CREATE",
  "UPDATE",
  "DELETE",
  "REMOVE",
  "CANCEL",
  "REFUND",
  "PAY",
  "PURCHASE",
  "PUBLISH",
  "INVITE",
  "TRANSFER",
  "BOOK",
  "SCHEDULE",
  "REPLY",
  "MOVE",
  "ARCHIVE",
];

const readOnly = [
  "GET",
  "LIST",
  "SEARCH",
  "FIND",
  "FETCH",
  "LOOKUP",
  "RETRIEVE",
];

export type ToolAccess = "allow" | "approval_required" | "deny";

export function defaultToolAccess(toolSlug: string): ToolAccess {
  const normalized = toolSlug.toUpperCase();
  if (consequential.some((verb) => normalized.includes(verb))) {
    return "approval_required";
  }
  if (readOnly.some((verb) => normalized.includes(verb))) return "allow";
  return "approval_required";
}

export function sanitizeToolOutput(value: unknown): unknown {
  if (Array.isArray(value)) return value.slice(0, 100).map(sanitizeToolOutput);
  if (!value || typeof value !== "object") {
    return typeof value === "string" ? value.slice(0, 20_000) : value;
  }
  const blocked = /token|secret|password|authorization|cookie|api[_-]?key/i;
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .filter(([key]) => !blocked.test(key))
      .map(([key, entry]) => [key, sanitizeToolOutput(entry)]),
  );
}
