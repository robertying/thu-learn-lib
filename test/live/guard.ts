import { urlOf } from '../../src/utils.ts';

/**
 * Requests that change something on the server. The live tests refuse them unless `LIVE_ALLOW_WRITES=1`, so a run
 * on someone else's account (or a test added later) can't submit homework or change favorites by accident.
 * Changing the website language is allowed: it only picks the language of names in the answers.
 */
const WRITE_PATHS = [
  '/b/wlxt/kczy/zy/student/tjzy', // submitHomework
  '/b/xt/wlkc_xsscb/student/add', // addToFavorites (also matches addZd: pinFavoriteItem)
  '/b/xt/wlkc_xsscb/student/delete', // removeFromFavorites
  '/b/xt/wlkc_xsscb/student/delZd', // unpinFavoriteItem
  '/b/wlxt/xt/wlkc_xsbjb/add', // setComment
  '/b/wlxt/kc/wlkc_kcpxb/addorUpdate', // sortCourses
];

export const ALLOW_WRITES = process.env.LIVE_ALLOW_WRITES === '1';

const guarded = <F extends (input: any, init?: any) => Promise<Response>>(inner: F): F =>
  ((input: Parameters<typeof fetch>[0], init?: unknown) => {
    const url = urlOf(input);
    if (!ALLOW_WRITES && WRITE_PATHS.some((p) => new URL(url).pathname.startsWith(p))) {
      return Promise.reject(new Error(`live tests are read-only: refused ${url} (set LIVE_ALLOW_WRITES=1)`));
    }
    return inner(input, init);
  }) as F;

// The library looks up globalThis.fetch on every request, so this covers it too.
globalThis.fetch = guarded(globalThis.fetch);
