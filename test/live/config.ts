import * as dotenv from 'dotenv';

dotenv.config({ path: 'test/live/.env' });

export const USERNAME = process.env.THU_USERNAME!;
export const PASSWORD = process.env.THU_PASSWORD!;
/** device fingerprint that id.tsinghua.edu.cn asks for (login fails with NO_CREDENTIAL without it) */
export const FINGERPRINT = process.env.THU_FINGERPRINT!;

export const credential = { username: USERNAME, password: PASSWORD, fingerPrint: FINGERPRINT };

export const config = { provider: () => credential };
