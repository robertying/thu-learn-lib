import { describe, expect, it } from 'vitest';

import { CourseType, FailReason, Language } from '../src/index.ts';
import * as URLS from '../src/urls.ts';
import { FakeServer, html } from './helpers/fake-server.ts';

describe('getUserInfo and setLanguage', () => {
  it('reads name and department from the homepage', async () => {
    const server = new FakeServer();
    server.profile = { name: '张三', department: '新雅书院' };
    const helper = await server.loggedInHelper();
    expect(await helper.getUserInfo()).toEqual({ name: '张三', department: '新雅书院' });
  });

  it('returns no department for the none the English homepage shows for a 书院', async () => {
    const server = new FakeServer();
    server.lang = 'en';
    server.profile = { name: '张三', department: 'none' };
    const helper = await server.loggedInHelper();
    expect(await helper.getUserInfo()).toEqual({ name: '张三', department: '' });
  });

  it('keeps an English department name', async () => {
    const server = new FakeServer();
    server.lang = 'en';
    server.profile = { name: '张三', department: 'Department of Computer Science and Technology' };
    const helper = await server.loggedInHelper();
    expect((await helper.getUserInfo()).department).toBe('Department of Computer Science and Technology');
  });

  it('returns empty strings without a profile card', async () => {
    const server = new FakeServer();
    const helper = await server.loggedInHelper();
    expect(await helper.getUserInfo()).toEqual({ name: '', department: '' });
  });

  it('switches the website language', async () => {
    const server = new FakeServer().on('POST', URLS.LEARN_WEBSITE_LANGUAGE(Language.EN), () => html(''));
    const helper = await server.loggedInHelper();
    await helper.setLanguage(Language.EN);
    expect(helper.getCurrentLanguage()).toBe(Language.EN);
    expect(server.requests[0].url.searchParams.get('websiteShowLanguage')).toBe('en_US');
  });

  it('keeps the language when the server refuses to switch', async () => {
    const server = new FakeServer().on(
      'POST',
      URLS.LEARN_WEBSITE_LANGUAGE(Language.EN),
      () => new Response('oops', { status: 500 }),
    );
    const helper = await server.loggedInHelper();
    await expect(helper.setLanguage(Language.EN)).rejects.toHaveProperty('reason', FailReason.OPERATION_FAILED);
    expect(helper.getCurrentLanguage()).toBe(Language.ZH);
  });

  it('logs in again when the homepage is the short login page of an expired session', async () => {
    const server = new FakeServer();
    server.homepageBody = '<a class="user-log">张三</a>';
    const helper = await server.loggedInHelper();
    server.expiry = 'html';
    server.expireSession();
    // the homepage route is public in the fake server; serve it through an authenticated one
    server.on('GET', URLS.LEARN_HOMEPAGE(CourseType.TEACHER), () => html('<a class="user-log">李四</a>'.padEnd(5000)));

    expect(await helper.getUserInfo({ courseType: CourseType.TEACHER })).toEqual({ name: '李四', department: '' });
    expect(server.loginCount).toBe(2);
  });
});
