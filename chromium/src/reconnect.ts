/** What the companion should do after the bridge closes the WebSocket. */
export type CloseAction =
  | 'reauth' // token is bad/stale — clear it and re-pair before retrying
  | 'backoff' // server is throttling — keep the token, just wait longer
  | 'reconnect'; // network/abnormal close — normal backoff, keep the token

// Mirror of the launcher's bridge close codes (see browser/bridge/server.rs).
// A browser cannot read the HTTP status of a failed upgrade, so the launcher
// signals the rejection reason through these WebSocket close codes instead.
const CLOSE_AUTH = 1008; // Policy Violation
const CLOSE_THROTTLED = 1013; // Try Again Later
const CLOSE_AUTH_LEGACY = 4401;
const CLOSE_THROTTLED_LEGACY = 4429;

export function classifyClose(code: number): CloseAction {
  if (code === CLOSE_AUTH || code === CLOSE_AUTH_LEGACY) return 'reauth';
  if (code === CLOSE_THROTTLED || code === CLOSE_THROTTLED_LEGACY) return 'backoff';
  return 'reconnect';
}

export class Backoff {
  private attempt = 0;
  constructor(private opts: { baseMs: number; maxMs: number; factor: number }) {}
  next(): number {
    const delay = Math.min(this.opts.maxMs, this.opts.baseMs * this.opts.factor ** this.attempt);
    this.attempt++;
    return delay;
  }
  reset(): void { this.attempt = 0; }
}
