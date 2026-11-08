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
      success({ aaData: [notice('n3', { sfyd: '否', sfqd: 0, jzsj: '2025-01-01', sfsc: '是', bznr: 'note' })] }),
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
      publishTime: '2025-03-01 10:00',
      expireTime: undefined,
      isFavorite: false,
      comment: undefined,
    });
    expect(notices[2]).toMatchObject({
      hasRead: false,
      markedImportant: false,
      expireTime: '2025-01-01',
      isFavorite: true,
      comment: 'note',
    });
  });

  it('fetches the detail page only for notices with an attachment', async () => {
    const server = setup();
    const helper = await server.loggedInHelper();
    const notices = await helper.getNotificationList('c1');

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
    const helper = await server.loggedInHelper({ generatePreviewUrlForFirstPage: false });
    expect(helper.previewFirstPage).toBe(false);
    expect((await helper.getNotificationList('c1'))[1].attachment?.previewUrl).toContain('pageType=all');

    helper.previewFirstPage = true;
    expect((await helper.getNotificationList('c1'))[1].attachment?.previewUrl).toContain('pageType=first');
  });

  it('rejects with INVALID_RESPONSE when a list fails', async () => {
    const server = setup().on('POST', URLS.LEARN_NOTIFICATION_LIST(CourseType.STUDENT, true), () =>
      json({ result: 'error' }),
    );
    const helper = await server.loggedInHelper();
    await expect(helper.getNotificationList('c1')).rejects.toHaveProperty('reason', FailReason.INVALID_RESPONSE);
  });
});
