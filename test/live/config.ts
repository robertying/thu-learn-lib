import * as dotenv from 'dotenv';

// The shell wins (so `LIVE_ONCE=… pnpm test:live` works), except for USERNAME: Windows sets its own
const { parsed } = dotenv.config({ path: 'test/live/.env' });
if (parsed?.USERNAME) process.env.USERNAME = parsed.USERNAME;

export const USERNAME = process.env.USERNAME!;
export const PASSWORD = process.env.PASSWORD!;
/** device fingerprint that id.tsinghua.edu.cn asks for (login fails with NO_CREDENTIAL without it) */
export const FINGERPRINT = process.env.FINGERPRINT!;

export const credential = { username: USERNAME, password: PASSWORD, fingerPrint: FINGERPRINT };

export const config = { provider: () => credential };
