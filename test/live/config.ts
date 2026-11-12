import * as dotenv from 'dotenv';

import { type CookieJar, cookieJarConfig } from '../../src/cookies.ts';

// The shell wins (so `LIVE_ONCE=… pnpm test:live` works), except for USERNAME: Windows sets its own
const { parsed } = dotenv.config({ path: 'test/live/.env' });
if (parsed?.USERNAME) process.env.USERNAME = parsed.USERNAME;

export const USERNAME = process.env.USERNAME!;
export const PASSWORD = process.env.PASSWORD!;
/** device fingerprint that id.tsinghua.edu.cn asks for (login fails with NO_CREDENTIAL without it) */
export const FINGERPRINT = process.env.FINGERPRINT!;

export const credential = { username: USERNAME, password: PASSWORD, fingerPrint: FINGERPRINT };

/** a helper config with the test account's provider and its own cookies (`cookieJar`, or a new jar) */
export const config = (cookieJar?: CookieJar) => ({ ...cookieJarConfig(cookieJar), provider: () => credential });
