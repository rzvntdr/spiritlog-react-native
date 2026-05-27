type Level = 'debug' | 'info' | 'warn' | 'error';

const LEVEL_ORDER: Record<Level, number> = { debug: 0, info: 1, warn: 2, error: 3 };

interface Entry {
  ts: number;
  level: Level;
  tag: string;
  msg: string;
}

const RING_SIZE = 500;
const ring: Entry[] = [];

function fmtArg(a: unknown): string {
  if (a instanceof Error) {
    return a.stack ? `${a.name}: ${a.message}\n${a.stack}` : `${a.name}: ${a.message}`;
  }
  if (a === undefined) return 'undefined';
  if (a === null) return 'null';
  if (typeof a === 'object') {
    try {
      return JSON.stringify(a);
    } catch {
      return String(a);
    }
  }
  return String(a);
}

function emit(level: Level, tag: string, args: unknown[]) {
  const msg = args.map(fmtArg).join(' ');
  ring.push({ ts: Date.now(), level, tag, msg });
  if (ring.length > RING_SIZE) ring.shift();

  // Always log to console — both in dev and release builds. In release builds
  // these are visible via `adb logcat` and via downstream crash reporters.
  const fn = (console as any)[level] ?? console.log;
  fn.call(console, `[${tag}]`, ...args);
}

export interface Logger {
  debug: (...args: unknown[]) => void;
  info: (...args: unknown[]) => void;
  warn: (...args: unknown[]) => void;
  error: (...args: unknown[]) => void;
}

export function createLogger(tag: string): Logger {
  return {
    debug: (...args) => emit('debug', tag, args),
    info: (...args) => emit('info', tag, args),
    warn: (...args) => emit('warn', tag, args),
    error: (...args) => emit('error', tag, args),
  };
}

/**
 * Return the in-memory ring buffer formatted as a single string ready to share.
 * Includes a header with the device timestamp at export time.
 */
export function getRecentLogs(): string {
  const lines = ring.map((e) => {
    const t = new Date(e.ts).toISOString();
    return `${t} ${e.level.toUpperCase().padEnd(5)} [${e.tag}] ${e.msg}`;
  });
  const header = `--- SpiritLog logs · exported ${new Date().toISOString()} · ${ring.length}/${RING_SIZE} entries ---`;
  return [header, ...lines].join('\n');
}

export function clearLogs() {
  ring.length = 0;
}

let installed = false;

/**
 * Install global JS error + unhandled promise rejection handlers so crashes
 * land in the ring buffer with stack traces. Safe to call multiple times.
 */
export function installGlobalErrorHandlers() {
  if (installed) return;
  installed = true;
  const log = createLogger('global');

  const ErrorUtils = (globalThis as any).ErrorUtils;
  if (ErrorUtils?.setGlobalHandler) {
    const prev = ErrorUtils.getGlobalHandler?.();
    ErrorUtils.setGlobalHandler((err: Error, isFatal?: boolean) => {
      log.error(`Uncaught${isFatal ? ' (FATAL)' : ''}:`, err);
      prev?.(err, isFatal);
    });
  }

  const onUnhandled = (event: any) => {
    const reason = event?.reason ?? event;
    log.error('Unhandled promise rejection:', reason);
  };
  (globalThis as any).addEventListener?.('unhandledrejection', onUnhandled);
}
