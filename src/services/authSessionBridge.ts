type RefreshHandler = () => Promise<string | null>;
type SessionExpiredHandler = () => void;

let inMemoryAccessToken = "";
let refreshHandler: RefreshHandler | null = null;
let sessionExpiredHandler: SessionExpiredHandler | null = null;
let singleFlightRefreshPromise: Promise<string | null> | null = null;

export function getAccessToken(): string {
  return inMemoryAccessToken;
}

export function setAccessToken(token: string): void {
  inMemoryAccessToken = typeof token === "string" ? token.trim() : "";
}

export function clearAccessToken(): void {
  inMemoryAccessToken = "";
}

export function registerRefreshHandler(handler: RefreshHandler): void {
  refreshHandler = handler;
}

export function registerSessionExpiredHandler(handler: SessionExpiredHandler): void {
  sessionExpiredHandler = handler;
}

export async function requestSingleFlightRefresh(): Promise<string | null> {
  if (!refreshHandler) {
    return null;
  }
  if (!singleFlightRefreshPromise) {
    singleFlightRefreshPromise = refreshHandler().finally(() => {
      singleFlightRefreshPromise = null;
    });
  }
  return singleFlightRefreshPromise;
}

export function notifySessionExpired(): void {
  clearAccessToken();
  if (sessionExpiredHandler) {
    sessionExpiredHandler();
  }
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("godt:session-expired"));
  }
}

