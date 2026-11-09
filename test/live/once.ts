import { execSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';

import { DAY_MS } from './dates.ts';

/**
 * Tests that leave a trace on the account (a failed login, items marked read, a favorite added and removed) run only
 * when named in `LIVE_ONCE` (comma-separated), e.g. `LIVE_ONCE=wrong-password pnpm test:live test/live/once.test.ts`.
 * Each covers some source files; after it passes, `test/live/.once.json` (not checked in) keeps a hash of them, and
 * later runs say when the test is due again because that code changed.
 */
const LEDGER = 'test/live/.once.json';

type Entry = {
  passedAt?: string;
  commit?: string;
  hash?: string;
  result?: string;
  /** what the last attempt found, passed or not (vitest hides the console output of passing tests) */
  lastResult?: string;
  attempts: string[];
};

const requested = new Set((process.env.LIVE_ONCE ?? '').split(',').map((s) => s.trim()));

const readLedger = (): Record<string, Entry> => (existsSync(LEDGER) ? JSON.parse(readFileSync(LEDGER, 'utf8')) : {});
const writeLedger = (ledger: Record<string, Entry>) => writeFileSync(LEDGER, JSON.stringify(ledger, null, 2) + '\n');

const hashFiles = (files: string[]) => {
  const h = createHash('sha256');
  for (const f of files) h.update(f).update(readFileSync(f));
  return h.digest('hex');
};

export type OnceTest = {
  name: string;
  /** source files whose change makes the test due again */
  covers: string[];
  /** at most this many attempts in 24 hours */
  maxPerDay: number;
};

/** whether the test should run now; logs why not */
export function shouldRun({ name, covers, maxPerDay }: OnceTest): boolean {
  const entry = readLedger()[name];
  const due = !entry?.hash || entry.hash !== hashFiles(covers);
  if (!requested.has(name)) {
    if (due)
      console.warn(
        `[once] "${name}" is due (${entry?.hash ? 'covered code changed' : 'never passed'}); run with LIVE_ONCE=${name}`,
      );
    return false;
  }
  const recent = (entry?.attempts ?? []).filter((t) => Date.now() - Date.parse(t) < DAY_MS);
  if (recent.length >= maxPerDay) {
    throw new Error(`[once] "${name}" ran ${recent.length} times in the last 24 hours (limit ${maxPerDay}); try later`);
  }
  return true;
}

export function recordAttempt(name: string) {
  const ledger = readLedger();
  const entry = (ledger[name] ??= { attempts: [] });
  entry.attempts = [...entry.attempts.filter((t) => Date.now() - Date.parse(t) < DAY_MS), new Date().toISOString()];
  writeLedger(ledger);
}

/** `result` is a short finding with no account data, e.g. "notice detail page marks it read" */
export function recordPass({ name, covers }: OnceTest, result: string) {
  const ledger = readLedger();
  const entry = (ledger[name] ??= { attempts: [] });
  Object.assign(entry, {
    passedAt: new Date().toISOString(),
    commit: execSync('git rev-parse --short HEAD').toString().trim(),
    hash: hashFiles(covers),
    result,
    lastResult: result,
  });
  writeLedger(ledger);
}

/** keep what an attempt found even when it can't pass yet, e.g. "no unread notice to try" */
export function recordResult(name: string, result: string) {
  const ledger = readLedger();
  (ledger[name] ??= { attempts: [] }).lastResult = result;
  writeLedger(ledger);
}
