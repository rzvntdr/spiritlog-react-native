import { File, Directory, Paths } from 'expo-file-system';

type Level = 'debug' | 'info' | 'warn' | 'error';

const LEVEL_ORDER: Record<Level, number> = { debug: 0, info: 1, warn: 2, error: 3 };

interface Entry {
  ts: number;
  level: Level;
  tag: string;
  msg: string;
}

/* ---------- in-memory ring buffer ---------- */

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

function formatLine(e: Entry): string {
  const t = new Date(e.ts).toISOString();
  return `${t} ${e.level.toUpperCase().padEnd(5)} [${e.tag}] ${e.msg}`;
}

/* ---------- persistent file logging ---------- */

const LOG_DIR_NAME = 'logs';
const CURRENT_FILE_NAME = 'current.log';
const PREVIOUS_FILE_NAME = 'previous.log';
const MAX_FILE_BYTES = 256 * 1024;       // 256 KB → ~3000 lines per file
const FLUSH_DELAY_MS = 1500;
const ERROR_FLUSH_DELAY_MS = 100;        // flush quicker on errors so a crash right after lands on disk

let fileQueue: string[] = [];
let fileFlushTimer: ReturnType<typeof setTimeout> | null = null;
let fileFlushInProgress = false;
let logsDir: Directory | null = null;
let currentFile: File | null = null;
let previousFile: File | null = null;
let initTried = false;

function tryInitFileLog() {
  if (initTried) return;
  initTried = true;
  try {
    logsDir = new Directory(Paths.document, LOG_DIR_NAME);
    if (!logsDir.exists) {
      logsDir.create({ intermediates: true, idempotent: true });
    }
    currentFile = new File(logsDir, CURRENT_FILE_NAME);
    previousFile = new File(logsDir, PREVIOUS_FILE_NAME);
  } catch {
    // file system unavailable — disk logging is best-effort, ring buffer still works
    logsDir = null;
    currentFile = null;
    previousFile = null;
  }
}

function rotateIfNeeded() {
  if (!currentFile || !previousFile) return;
  try {
    if (!currentFile.exists) return;
    const size = (currentFile as unknown as { size: number }).size;
    if (size < MAX_FILE_BYTES) return;
    if (previousFile.exists) previousFile.delete();
    currentFile.move(previousFile);
    // currentFile.uri now points to previous location; recreate the current reference
    currentFile = new File(logsDir!, CURRENT_FILE_NAME);
  } catch {}
}

function flushFileLog() {
  if (fileFlushInProgress) return;
  if (fileQueue.length === 0) return;
  tryInitFileLog();
  if (!currentFile) return;

  fileFlushInProgress = true;
  const batch = fileQueue.join('');
  fileQueue = [];

  try {
    rotateIfNeeded();
    let existing = '';
    if (currentFile.exists) {
      try {
        existing = currentFile.textSync();
      } catch {}
    } else {
      try {
        currentFile.create({ overwrite: false });
      } catch {}
    }
    currentFile.write(existing + batch);
  } catch {
    // dropped batch — recoverable, ring still has them
  }

  fileFlushInProgress = false;
  if (fileQueue.length > 0) {
    scheduleFileFlush();
  }
}

function scheduleFileFlush(delay = FLUSH_DELAY_MS) {
  if (fileFlushTimer) return;
  fileFlushTimer = setTimeout(() => {
    fileFlushTimer = null;
    flushFileLog();
  }, delay);
}

function queueForFile(entry: Entry) {
  fileQueue.push(formatLine(entry) + '\n');
  scheduleFileFlush(entry.level === 'error' ? ERROR_FLUSH_DELAY_MS : FLUSH_DELAY_MS);
}

/* ---------- emit ---------- */

function emit(level: Level, tag: string, args: unknown[]) {
  const msg = args.map(fmtArg).join(' ');
  const entry: Entry = { ts: Date.now(), level, tag, msg };

  ring.push(entry);
  if (ring.length > RING_SIZE) ring.shift();

  // Console (logcat: tag ReactNativeJS)
  const fn = (console as any)[level] ?? console.log;
  fn.call(console, `[${tag}] ${msg}`);

  // Disk (survives crashes; previous session's logs persist across restarts)
  queueForFile(entry);
}

/* ---------- public API ---------- */

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

/** Cap on exported log size — keep the most RECENT slice so today's session
 *  isn't buried under weeks of history (the on-disk file keeps everything). */
const EXPORT_TAIL_BYTES = 96 * 1024;

/**
 * Returns the persisted log: previous-rotated file (oldest) + current file +
 * in-memory ring entries that haven't been flushed yet. Flushes pending writes
 * before reading. Truncated to the most recent {@link EXPORT_TAIL_BYTES} so the
 * newest events (the ones you usually care about) are at the bottom and not
 * lost in the middle of a large file.
 */
export async function getRecentLogs(): Promise<string> {
  flushFileLog();
  tryInitFileLog();

  let content = '';
  try {
    if (previousFile?.exists) {
      content += previousFile.textSync();
    }
  } catch {}
  try {
    if (currentFile?.exists) {
      content += currentFile.textSync();
    }
  } catch {}

  if (content.length === 0) {
    content = ring.map(formatLine).join('\n') + '\n';
  }

  let truncatedNote = '';
  if (content.length > EXPORT_TAIL_BYTES) {
    let tail = content.slice(content.length - EXPORT_TAIL_BYTES);
    // Drop the partial first line so the export starts on a clean entry.
    const nl = tail.indexOf('\n');
    if (nl >= 0) tail = tail.slice(nl + 1);
    truncatedNote = ` · tail ${Math.round(EXPORT_TAIL_BYTES / 1024)}KB of ${Math.round(content.length / 1024)}KB`;
    content = tail;
  }

  const sizeNote = currentFile?.exists
    ? `${(currentFile as unknown as { size: number }).size}B current`
    : 'no current file';
  const header = `--- SpiritLog logs · exported ${new Date().toISOString()} · ${sizeNote}${truncatedNote} ---\n`;
  return header + content;
}

export async function clearLogs() {
  ring.length = 0;
  fileQueue = [];
  tryInitFileLog();
  try {
    if (currentFile?.exists) currentFile.delete();
  } catch {}
  try {
    if (previousFile?.exists) previousFile.delete();
  } catch {}
}

/** Force-flush queued log lines to disk now. Useful before risky operations. */
export function flushLogs(): void {
  flushFileLog();
}

/* ---------- global error handlers ---------- */

let installed = false;

export function installGlobalErrorHandlers() {
  if (installed) return;
  installed = true;
  const log = createLogger('global');

  const ErrorUtils = (globalThis as any).ErrorUtils;
  if (ErrorUtils?.setGlobalHandler) {
    const prev = ErrorUtils.getGlobalHandler?.();
    ErrorUtils.setGlobalHandler((err: Error, isFatal?: boolean) => {
      log.error(`Uncaught${isFatal ? ' (FATAL)' : ''}:`, err);
      flushFileLog();
      prev?.(err, isFatal);
    });
  }

  const onUnhandled = (event: any) => {
    const reason = event?.reason ?? event;
    log.error('Unhandled promise rejection:', reason);
    flushFileLog();
  };
  (globalThis as any).addEventListener?.('unhandledrejection', onUnhandled);
}
