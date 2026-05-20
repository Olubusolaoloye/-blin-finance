export type { BlinError } from "@blin/shared";
export { BlinErrors } from "@blin/shared";

/** Narrows an unknown catch value into a displayable message. Never exposes internal stack in production. */
export function toDisplayMessage(err: unknown): string {
  if (process.env.NODE_ENV === "development") {
    if (err instanceof Error) return err.message;
    return String(err);
  }
  // Production: generic message for anything that slipped through
  if (typeof err === "object" && err !== null && "_tag" in err) {
    const blinErr = err as { _tag: string; message: string };
    return blinErr.message;
  }
  return "Something went wrong. Please try again.";
}
