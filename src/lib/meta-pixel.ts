declare global {
  interface Window {
    fbq: (method: string, eventName: string, params?: Record<string, unknown>) => void;
    _fbq: unknown;
  }
}

const PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID;

function isReady(): boolean {
  return !!PIXEL_ID && typeof window !== "undefined" && typeof window.fbq === "function";
}

export function fbqPageView() {
  if (!isReady()) return;
  window.fbq("track", "PageView");
}

export function fbqEvent(eventName: string, params?: Record<string, unknown>) {
  if (!isReady()) return;
  window.fbq("track", eventName, params);
}

export function fbqCustom(eventName: string, params?: Record<string, unknown>) {
  if (!isReady()) return;
  window.fbq("trackCustom", eventName, params);
}
