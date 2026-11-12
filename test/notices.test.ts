import { Base64 } from 'js-base64';
import { describe, expect, it } from 'vitest';

import { ContentType, CourseType, FailReason } from '../src/index.ts';
import * as URLS from '../src/urls.ts';
import { FakeServer, courseIdOf, html, json, success } from './helpers/fake-server.ts';

const notice = (id: string, overrides: Record<string, unknown> = {}) => ({
  ggid: id,
  ggnr: Base64.encode(`<p>内容 ${id}</p>`),
  bt: `Title &lt;${id}&gt;`,
  fbrxm: 'Teacher',
  sfyd: '是',
  sfqd: '1',
  fbsj: '2025-03-01 10:00',
  fbsjStr: 'unused',
  jzsj: null,
  sfsc: '否',
  bznr: null,
  fjmc: null,
  ...overrides,
});

const detailPage = (fileId: string) =>
  `<html><body><div id="attachment"><div class="fl"><a class="ml-10" href="/b/wlxt/kj/download?wjid=${fileId}">dl</a><span class="color_999">1.5M</span></div></div></body></html>`;

const setup = () =>
  new FakeServer()
    .on('POST', URLS.LEARN_NOTIFICATION_LIST(CourseType.STUDENT, false), (req) =>
      success({ aaData: courseIdOf(req) === 'c1' ? [notice('n1'), notice('n2', { fjmc: 'slides.pdf' })] : [] }),
    )
    .on('POST', URLS.LEARN_NOTIFICATION_LIST(CourseType.STUDENT, true), () =>
      success({ aaData: [notice('n3', { sfyd: '否', sfqd: 0, jzsj: '2025-01-01 00:00', sfsc: '是', bznr: 'note' })] }),
    )
    .on('GET', URLS.LEARN_NOTIFICATION_DETAIL('', '', CourseType.STUDENT), (req) =>
      html(detailPage(`file-${req.url.searchParams.get('id')}`)),
    );

describe('getNotificationList', () => {
  it('merges current and expired notices and parses them', async () => {
    const server = setup();
    const helper = await server.loggedInHelper();
    const notices = await helper.getNotificationList('c1');

    expect(notices.map((n) => n.id)).toEqual(['n1', 'n2', 'n3']);
    expect(notices[0]).toEqual({
      id: 'n1',
      content: '<p>内容 n1</p>',
      title: 'Title <n1>',
      url: URLS.LEARN_NOTIFICATION_DETAIL('c1', 'n1', CourseType.STUDENT),
      publisher: 'Teacher',
      hasRead: true,
      markedImportant: true,
      publishTime: '2025-03-01T10:00:00+08:00',
      expireTime: undefined,
      isFavorite: false,
      comment: undefined,
    });
    expect(notices[2]).toMatchObject({
      hasRead: false,
      markedImportant: false,
      expireTime: '2025-01-01T00:00:00+08:00',
      isFavorite: true,
      comment: 'note',
    });
  });

  it('makes 2 list requests and no attachment requests by default', async () => {
    const server = setup();
    const helper = await server.loggedInHelper();
    const notices = await helper.getNotificationList('c1');

    expect(notices.map((n) => [n.id, n.attachmentName, n.attachment])).toEqual([
      ['n1', undefined, undefined],
      ['n2', 'slides.pdf', undefined],
      ['n3', undefined, undefined],
    ]);
    expect(server.requests).toHaveLength(2);
  });

  it('gets one attachment on demand, without a request for a notice that has none', async () => {
    const server = setup();
    const helper = await server.loggedInHelper();
    const [n1, n2] = await helper.getNotificationList('c1');
    server.reset();

    expect(await helper.getNotificationAttachment(n1)).toBeUndefined();
    expect(await helper.getNotificationAttachment(n2)).toMatchObject({ id: 'file-n2', name: 'slides.pdf' });
    expect(server.requests).toHaveLength(1);
  });

  it('asks the predicate only about notices with an attachment', async () => {
    const server = setup();
    const helper = await server.loggedInHelper();
    const seen: string[] = [];
    await helper.getNotificationList('c1', {
      attachments: (n) => {
        seen.push(n.id);
        return false;
      },
    });
    expect(seen).toEqual(['n2']);
    expect(server.requests).toHaveLength(2);
  });

  it('fetches the detail page only for notices with an attachment', async () => {
    const server = setup();
    const helper = await server.loggedInHelper();
    const notices = await helper.getNotificationList('c1', { attachments: 'all' });

    expect(notices[1].attachment).toEqual({
      name: 'slides.pdf',
      id: 'file-n2',
      downloadUrl: `${URLS.LEARN_PREFIX}/b/wlxt/kj/download?wjid=file-n2`,
      previewUrl: URLS.LEARN_FILE_PREVIEW(ContentType.NOTIFICATION, 'file-n2', CourseType.STUDENT, true),
      size: '1.5M',
    });
    expect(notices[0].attachment).toBeUndefined();
    // 2 lists + 1 detail page
    expect(server.requests).toHaveLength(3);
    expect(server.count(URLS.LEARN_NOTIFICATION_DETAIL('', '', CourseType.STUDENT))).toBe(1);
  });

  it('follows previewFirstPage for preview URLs', async () => {
    const server = setup();
    const helper = await server.loggedInHelper({ previewFirstPage: false });
    expect(helper.previewFirstPage).toBe(false);
    const all = { attachments: 'all' } as const;
    expect((await helper.getNotificationList('c1', all))[1].attachment?.previewUrl).toContain('pageType=all');

    helper.previewFirstPage = true;
    expect((await helper.getNotificationList('c1', all))[1].attachment?.previewUrl).toContain('pageType=first');
  });

  it('rejects with INVALID_RESPONSE when a list fails', async () => {
    const server = setup().on('POST', URLS.LEARN_NOTIFICATION_LIST(CourseType.STUDENT, true), () =>
      json({ result: 'error' }),
    );
    const helper = await server.loggedInHelper();
    await expect(helper.getNotificationList('c1')).rejects.toHaveProperty('reason', FailReason.INVALID_RESPONSE);
  });
});

describe('getNotificationAttachment', () => {
  it('returns undefined when the detail page has no attachment link', async () => {
    const server = new FakeServer().on('GET', URLS.LEARN_NOTIFICATION_DETAIL('', '', CourseType.STUDENT), () =>
      html('<html><body>no attachment</body></html>'),
    );
    const helper = await server.loggedInHelper();
    const url = URLS.LEARN_NOTIFICATION_DETAIL('c1', 'n1', CourseType.STUDENT);

    expect(await helper.getNotificationAttachment({ url, attachmentName: 'gone.pdf' })).toBeUndefined();
  });

  it('ignores an attachment link to another site', async () => {
    const server = new FakeServer().on('GET', URLS.LEARN_NOTIFICATION_DETAIL('', '', CourseType.STUDENT), () =>
      html('<html><body><a class="ml-10" href="//example.com/b/download?wjid=1">a.pdf</a></body></html>'),
    );
    const helper = await server.loggedInHelper();
    const url = URLS.LEARN_NOTIFICATION_DETAIL('c1', 'n1', CourseType.STUDENT);

    expect(await helper.getNotificationAttachment({ url, attachmentName: 'a.pdf' })).toBeUndefined();
  });

  it('rejects with UNEXPECTED_STATUS when the detail page is an error page', async () => {
    const server = new FakeServer().on('GET', URLS.LEARN_NOTIFICATION_DETAIL('', '', CourseType.STUDENT), () =>
      html('<html>error</html>', 500),
    );
    const helper = await server.loggedInHelper();
    const url = URLS.LEARN_NOTIFICATION_DETAIL('c1', 'n1', CourseType.STUDENT);

    await expect(helper.getNotificationAttachment({ url, attachmentName: 'a.pdf' })).rejects.toHaveProperty(
      'reason',
      FailReason.UNEXPECTED_STATUS,
    );
  });

  it('logs in again when the detail page is the short login page of an expired session', async () => {
    const server = setup();
    const helper = await server.loggedInHelper();
    server.expiry = 'html';
    server.expireSession();
    const url = URLS.LEARN_NOTIFICATION_DETAIL('c1', 'n2', CourseType.STUDENT);

    expect((await helper.getNotificationAttachment({ url, attachmentName: 'slides.pdf' }))?.id).toBe('file-n2');
    expect(server.loginCount).toBe(2);
  });

  it('does not take a full page that mentions login_timeout for a login page', async () => {
    const server = new FakeServer().on('GET', URLS.LEARN_NOTIFICATION_DETAIL('', '', CourseType.STUDENT), () =>
      html(`<script>/* login_timeout */</script>${detailPage('f1')}`.padEnd(5000)),
    );
    const helper = await server.loggedInHelper();
    const url = URLS.LEARN_NOTIFICATION_DETAIL('c1', 'n1', CourseType.STUDENT);

    expect((await helper.getNotificationAttachment({ url, attachmentName: 'a.pdf' }))?.id).toBe('f1');
    expect(server.loginCount).toBe(1);
  });
});

describe('markNotificationRead', () => {
  const url = URLS.LEARN_NOTIFICATION_DETAIL('c1', 'n1', CourseType.STUDENT);

  it('loads the notice page once, with the CSRF token', async () => {
    const server = setup();
    const helper = await server.loggedInHelper();

    await helper.markNotificationRead({ url });

    expect(server.requests).toHaveLength(1);
    expect(server.requests[0].url.searchParams.get('_csrf')).toBe(helper.getCSRFToken());
  });

  it.each(['status', 'redirect', 'html'] as const)(
    'logs in again and loads it once more when the session has expired (%s)',
    async (expiry) => {
      const server = setup();
      const helper = await server.loggedInHelper();
      server.expiry = expiry;
      server.expireSession();

      await helper.markNotificationRead({ url });

      expect(server.loginCount).toBe(2);
      expect(server.count(URLS.LEARN_NOTIFICATION_DETAIL('', '', CourseType.STUDENT))).toBe(2);
    },
  );

  it('rejects with UNEXPECTED_STATUS when the server fails the page', async () => {
    const server = new FakeServer().on(
      'GET',
      URLS.LEARN_NOTIFICATION_DETAIL('', '', CourseType.STUDENT),
      () => new Response('error', { status: 500 }),
    );
    const helper = await server.loggedInHelper();

    await expect(helper.markNotificationRead({ url })).rejects.toHaveProperty('reason', FailReason.UNEXPECTED_STATUS);
    expect(server.loginCount).toBe(1);
  });
});
