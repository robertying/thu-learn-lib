import { describe, it, expect } from 'vitest';
import { Learn2018Helper, FailReason } from '../../src/index.ts';
import { FP, P, U, config } from './config.ts';

describe('helper authentication', () => {
  it('should login & logout correctly if account is right', async () => {
    const helper = new Learn2018Helper();
    await helper.login(U, P, FP);
    await helper.logout();
  });

  it('should failed to login if account is incorrect', async () => {
    const helper = new Learn2018Helper();
    await expect(helper.login('nouser', 'nopass', FP)).rejects.toHaveProperty('reason', FailReason.BAD_CREDENTIAL);
  });

  it("should throw error if hasn't login and not provide up config", async () => {
    const helper = new Learn2018Helper();
    await expect(helper.login()).rejects.toHaveProperty('reason', FailReason.NO_CREDENTIAL);
    await expect(helper.getSemesterIdList()).rejects.toHaveProperty('reason', FailReason.NO_CREDENTIAL);
  });

  it('should not throw error if manually invoke login()', async () => {
    const helper = new Learn2018Helper();
    await helper.login(U, P, FP);
    const semesters = await helper.getSemesterIdList();
    expect(Array.isArray(semesters)).toEqual(true);
  });

  it('should not throw error if provide CredentialProvider', async () => {
    const helper = new Learn2018Helper(config);
    const semesters = await helper.getSemesterIdList();
    expect(Array.isArray(semesters)).toEqual(true);
  });

  it('should not throw error if invoke logout() but provide CredentialProvider', async () => {
    const helper = new Learn2018Helper(config);
    // First get
    const semesters = await helper.getSemesterIdList();
    expect(Array.isArray(semesters)).toEqual(true);
    // Logout
    await helper.logout();
    // Second get
    const semesters2 = await helper.getSemesterIdList();
    expect(Array.isArray(semesters2)).toEqual(true);
  });
});
