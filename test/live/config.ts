import * as dotenv from 'dotenv';

// override: a shell's own USERNAME (set on Windows) must not win over the file
dotenv.config({ path: 'test/live/.env', override: true });

export const USERNAME = process.env.USERNAME!;
export const PASSWORD = process.env.PASSWORD!;
/** device fingerprint that id.tsinghua.edu.cn asks for (login fails with NO_CREDENTIAL without it) */
export const FINGERPRINT = process.env.FINGERPRINT!;

export const credential = { username: USERNAME, password: PASSWORD, fingerPrint: FINGERPRINT };

export const config = { provider: () => credential };
