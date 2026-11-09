import { describe, expect, it } from 'vitest';

import { ContentType, FailReason } from '../src/index.ts';
import * as URLS from '../src/urls.ts';
import { FakeServer, courseIdOf, json, success } from './helpers/fake-server.ts';

const item = (ywlx: string, overrides: Record<string, unknown> = {}) => ({
  ywid: `id-${ywlx}`,
  ywlx,
  ywbt: 'T &amp; t',
  tlsj: 'discussion time',
  ywsj: 'item time',
  ywzt: 'state',
  ywbz: null,
  xnxq: '2024-2025-1',
  wlkcid: 'c1',
  sfzd: '否',
  zdsj: null,
  bznr: null,
  scsj: '2025-03-05 08:00',
  id: `fav-${ywlx}`,
  ...overrides,
});

describe('favorites', () => {
  it('lists favorites, skipping unknown types', async () => {
    const server = new FakeServer().on('POST', URLS.LEARN_FAVORITE_LIST(), (req) => {
      expect(courseIdOf(req)).toBe('c1');
      return success({ aaData: [item('KCZY'), item('KCTL', { sfzd: '是', zdsj: 1700000000 }), item('KCKB')] });
    });
    const helper = await server.loggedInHelper();
    const favorites = await helper.getFavorites('c1');

    expect(favorites).toEqual([
      {
        id: 'id-KCZY',
        type: ContentType.HOMEWORK,
        title: 'T & t',
        time: 'item time',
        state: 'state',
        extra: undefined,
        semesterId: '2024-2025-1',
        courseId: 'c1',
        pinned: false,
        pinnedTime: undefined,
        comment: undefined,
        addedTime: '2025-03-05T08:00:00+08:00',
        itemId: 'fav-KCZY',
      },
      expect.objectContaining({
        type: ContentType.DISCUSSION,
        time: 'discussion time',
        pinned: true,
        pinnedTime: '2023-11-15T06:13:20+08:00',
      }),
    ]);
    expect(server.requests[0].url.searchParams.get('ywlx')).toBe('ALL');
  });

  it('filters by type in the URL', async () => {
    const server = new FakeServer().on('POST', URLS.LEARN_FAVORITE_LIST(), () => success({ aaData: [] }));
    const helper = await server.loggedInHelper();
    await helper.getFavorites(undefined, ContentType.FILE);
    expect(server.requests[0].url.searchParams.get('ywlx')).toBe('KCKJ');
  });

  it('adds and removes favorites', async () => {
    const server = new FakeServer()
      // what the real server answers with the website in English
      .on('GET', URLS.LEARN_FAVORITE_ADD(ContentType.NOTIFICATION, ''), () =>
        json({ result: 'success', msg: 'Added successfully.' }),
      )
      .on('GET', URLS.LEARN_FAVORITE_REMOVE(''), () => json({ result: 'error', msg: 'Failed' }));
    const helper = await server.loggedInHelper();

    await helper.addToFavorites(ContentType.NOTIFICATION, 'n1');
    expect(server.requests[0].url.searchParams.get('ywid')).toBe('n1');
    expect(server.requests[0].url.searchParams.get('ywlx')).toBe('KCGG');
    await expect(helper.removeFromFavorites('n1')).rejects.toHaveProperty('reason', FailReason.OPERATION_FAILED);
  });

  it('pins and unpins', async () => {
    const server = new FakeServer()
      .on('POST', URLS.LEARN_FAVORITE_PIN, () => json({ result: 'success' }))
      .on('POST', URLS.LEARN_FAVORITE_UNPIN, () => json({ result: 'error' }));
    const helper = await server.loggedInHelper();
    await helper.pinFavoriteItem('n1');
    expect(server.requests[0].form!.get('ywid')).toBe('n1');
    await expect(helper.unpinFavoriteItem('n1')).rejects.toHaveProperty('reason', FailReason.OPERATION_FAILED);
  });
});

describe('comments', () => {
  it('sets a comment', async () => {
    const server = new FakeServer().on('POST', URLS.LEARN_COMMENT_SET, () =>
      json({ result: 'success', msg: '保存成功' }),
    );
    const helper = await server.loggedInHelper();
    await helper.setComment(ContentType.FILE, 'f1', 'remember');
    const form = server.requests[0].form!;
    expect([form.get('ywlx'), form.get('ywid'), form.get('bznr')]).toEqual(['KCKJ', 'f1', 'remember']);
  });

  it('lists comments', async () => {
    const server = new FakeServer().on('POST', URLS.LEARN_COMMENT_LIST(), () =>
      success({
        aaData: [
          {
            ywid: 'f1',
            ywlx: 'KCKJ',
            bt: 'remember',
            bznrstring: '&lt;p&gt;remember&lt;/p&gt;',
            ywbt: 'File 1',
            xnxq: '2024-2025-1',
            wlkcid: 'c1',
            cjsj: 'now',
            id: 'cm1',
          },
        ],
      }),
    );
    const helper = await server.loggedInHelper();
    expect(await helper.getComments()).toEqual([
      {
        id: 'f1',
        type: ContentType.FILE,
        content: 'remember',
        contentHTML: '<p>remember</p>',
        title: 'File 1',
        semesterId: '2024-2025-1',
        courseId: 'c1',
        commentTime: 'now',
        itemId: 'cm1',
      },
    ]);
  });
});
