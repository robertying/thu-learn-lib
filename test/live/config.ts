import * as dotenv from 'dotenv';

dotenv.config({ path: 'test/live/.env' });

export const U = process.env.U!; // username
export const P = process.env.P!; // password
/** device fingerprint that id.tsinghua.edu.cn asks for (login fails with NO_CREDENTIAL without it) */
export const FP = process.env.FP!;

export const credential = { username: U, password: P, fingerPrint: FP };

export const config = { provider: () => credential };
