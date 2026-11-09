import { describe, expect, it } from 'vitest';

import { ContentType, CourseType, FailReason } from '../src/index.ts';
import * as URLS from '../src/urls.ts';
import { FakeServer, json, success } from './helpers/fake-server.ts';

const categories = () =>
  success({
    rows: [
      { kjflid: 'cat1', bt: 'Slides &amp; notes', czsj: '2025-02-20' },
      { kjflid: 'cat2', bt: 'Exams', czsj: '2025-02-21' },
    ],
  });

const studentFile = {
  kjxxid: 'k1',
  wjid: 'w1',
  kjflid: 'cat1',
  bt: 'Lecture 1',
  ms: 'Intro',
  wjdx: 2048,
  fileSize: '2K',
  scsj: '2025-02-22',
  isNew: true,
  sfqd: 1,
  xsllcs: 5,
  xzcs: 3,
  wjlx: 'pdf',
};

describe('getFileList', () => {
  it('still returns the files without category when the category list fails', async () => {
    const server = new FakeServer()
      .on('GET', URLS.LEARN_FILE_LIST('c1', CourseType.STUDENT), () => success([studentFile]))
      .on('GET', URLS.LEARN_FILE_CATEGORY_LIST('c1', CourseType.STUDENT), () => json({ result: 'error' }));
    const helper = await server.loggedInHelper();
    const files = await helper.getFileList('c1');
    expect(files.map((f) => [f.id, f.category])).toEqual([['k1', undefined]]);
  });

  it('turns the 1 / 0 isNew flag and string numbers into booleans and numbers', async () => {
    const server = new FakeServer()
      .on('GET', URLS.LEARN_FILE_LIST('c1', CourseType.STUDENT), () =>
        success([
          { ...studentFile, kjxxid: 'new', isNew: 1 },
          { ...studentFile, kjxxid: 'old', isNew: 0, sfqd: 0 },
          { ...studentFile, kjxxid: 'strings', isNew: '1', sfqd: '1', wjdx: '2048', xsllcs: '5', xzcs: '3' },
          {
            ...studentFile,
            kjxxid: 'missing',
            isNew: undefined,
            sfqd: undefined,
            wjdx: undefined,
            xsllcs: undefined,
            xzcs: undefined,
          },
        ]),
      )
      .on('GET', URLS.LEARN_FILE_CATEGORY_LIST('c1', CourseType.STUDENT), categories);
    const helper = await server.loggedInHelper();
    const files = await helper.getFileList('c1');

    expect(files.map((f) => [f.id, f.isNew, f.markedImportant, f.rawSize, f.visitCount, f.downloadCount])).toEqual([
      ['new', true, true, 2048, 5, 3],
      ['old', false, false, 2048, 5, 3],
      ['strings', true, true, 2048, 5, 3],
      ['missing', false, false, 0, 0, 0],
    ]);
  });

  it('parses files and attaches their category', async () => {
    const server = new FakeServer()
      .on('GET', URLS.LEARN_FILE_LIST('c1', CourseType.STUDENT), () => success([studentFile]))
      .on('GET', URLS.LEARN_FILE_CATEGORY_LIST('c1', CourseType.STUDENT), categories);
    const helper = await server.loggedInHelper();
    const files = await helper.getFileList('c1');

    const downloadUrl = URLS.LEARN_FILE_DOWNLOAD('w1', CourseType.STUDENT);
    const previewUrl = URLS.LEARN_FILE_PREVIEW(ContentType.FILE, 'w1', CourseType.STUDENT, true);
    expect(files).toEqual([
      {
        id: 'k1',
        fileId: 'w1',
        category: { id: 'cat1', title: 'Slides & notes', creationTime: '2025-02-20' },
        title: 'Lecture 1',
        description: 'Intro',
        rawSize: 2048,
        size: '2K',
        uploadTime: '2025-02-22',
        publishTime: '2025-02-22',
        downloadUrl,
        previewUrl,
        isNew: true,
        markedImportant: true,
        visitCount: 5,
        downloadCount: 3,
        fileType: 'pdf',
        remoteFile: { id: 'w1', name: 'Lecture 1', downloadUrl, previewUrl, size: '2K' },
      },
    ]);
    // file list + category list
    expect(server.requests).toHaveLength(2);
  });

  it('reads the teacher list from resultsList', async () => {
    const server = new FakeServer()
      .on('GET', URLS.LEARN_FILE_LIST('c1', CourseType.TEACHER), () =>
        success({ resultsList: [{ ...studentFile, xsllcs: undefined, llcs: 9, sfqd: '1' }] }),
      )
      .on('GET', URLS.LEARN_FILE_CATEGORY_LIST('c1', CourseType.TEACHER), categories);
    const helper = await server.loggedInHelper();
    const [file] = await helper.getFileList('c1', CourseType.TEACHER);
    expect(file).toMatchObject({ id: 'k1', visitCount: 9, markedImportant: true });
    expect(file.downloadUrl).toBe(URLS.LEARN_FILE_DOWNLOAD('w1', CourseType.TEACHER));
  });

  it('rejects with INVALID_RESPONSE when the list fails', async () => {
    const server = new FakeServer().on('GET', URLS.LEARN_FILE_LIST('c1', CourseType.STUDENT), () =>
      json({ result: 'error' }),
    );
    const helper = await server.loggedInHelper();
    await expect(helper.getFileList('c1')).rejects.toHaveProperty('reason', FailReason.INVALID_RESPONSE);
  });
});

describe('getFileListByCategory', () => {
  it('parses the student array rows', async () => {
    const row = [
      'k2',
      'Exam &amp; key',
      0,
      null,
      null,
      'desc',
      '2025-01-01',
      'w2',
      1,
      3 * 1024 * 1024,
      '2025-01-02',
      '是', // favorited
      '否',
      'zip',
      'my note',
    ];
    const server = new FakeServer().on('GET', URLS.LEARN_FILE_LIST_BY_CATEGORY_STUDENT('c1', 'cat2'), () =>
      success([row]),
    );
    const helper = await server.loggedInHelper();
    const [file] = await helper.getFileListByCategory('c1', 'cat2');
    expect(file).toMatchObject({
      id: 'k2',
      fileId: 'w2',
      title: 'Exam & key',
      description: 'desc',
      rawSize: 3 * 1024 * 1024,
      size: '3.00M',
      uploadTime: '2025-01-01',
      publishTime: '2025-01-02',
      isNew: true,
      markedImportant: false,
      visitCount: 0,
      fileType: 'zip',
      isFavorite: true,
      comment: 'my note',
    });
  });

  it("reads an unfavorited file's '否' as false", async () => {
    const row = ['k3', 't', 0, null, null, null, '2025-01-01', 'w3', 0, 1, '2025-01-02', '否', '否', 'pdf', null];
    const server = new FakeServer().on('GET', URLS.LEARN_FILE_LIST_BY_CATEGORY_STUDENT('c1', 'cat2'), () =>
      success([row]),
    );
    const helper = await server.loggedInHelper();
    const [file] = await helper.getFileListByCategory('c1', 'cat2');
    expect(file.isFavorite).toBe(false);
  });

  it('posts the course and category for teachers', async () => {
    const server = new FakeServer().on('POST', URLS.LEARN_FILE_LIST_BY_CATEGORY_TEACHER, () =>
      success({ aaData: [studentFile] }),
    );
    const helper = await server.loggedInHelper();
    const [file] = await helper.getFileListByCategory('c1', 'cat1', CourseType.TEACHER);
    expect(file.id).toBe('k1');
    expect(JSON.parse(server.requests[0].form!.get('aoData') as string)).toEqual([
      { name: 'wlkcid', value: 'c1' },
      { name: 'kjflid', value: 'cat1' },
    ]);
  });
});
