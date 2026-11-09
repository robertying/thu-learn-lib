import { afterAll, beforeAll, describe, expect, inject, it } from 'vitest';
import { ContentType, Language, Learn2018Helper, parseCourseMeeting } from '../../src/index.ts';
import { config } from './config.ts';
import { ALLOW_WRITES } from './guard.ts';

describe('helper interaction', () => {
  const h = new Learn2018Helper(config);

  beforeAll(async () => {
    await h.login();
  });
  afterAll(async () => {
    await h.logout();
  });

  const courseTester = inject('studentCourse');
  const semesterTester = inject('studentSemester');

  it('switches the website language and back', async () => {
    const pre_lang = h.getCurrentLanguage();
    const toset_lang = pre_lang === Language.EN ? Language.ZH : Language.EN;
    await h.setLanguage(toset_lang);
    expect(h.getCurrentLanguage()).toBe(toset_lang);
    await h.setLanguage(pre_lang);
  });

  it("reads the courses' time and location in both website languages", async () => {
    const pre_lang = h.getCurrentLanguage();
    // entries without a day or period, which the server lists for courses with no fixed time
    const empty = /星期第0节|section\s*0\b/i;
    try {
      for (const lang of [Language.ZH, Language.EN]) {
        await h.setLanguage(lang);
        const courses = await h.getCourseList(semesterTester, { lang, timeAndLocation: true });
        const entries = courses.flatMap((c) => c.timeAndLocation ?? []);
        expect({ lang, unread: entries.filter((e) => !parseCourseMeeting(e) && !empty.test(e)) }).toEqual({
          lang,
          unread: [],
        });
        // the English website writes `Section 1 of Mon (Week all ), …`
        if (lang === Language.EN && entries.some((e) => !empty.test(e)))
          expect(entries.some((e) => /section/i.test(e))).toBe(true);
      }
    } finally {
      await h.setLanguage(pre_lang);
    }
  });

  // adds, pins and removes favorites, so only with LIVE_ALLOW_WRITES=1 (and a student course)
  it.runIf(ALLOW_WRITES && !!courseTester)('adds, pins, unpins and removes favorites', async () => {
    const oldFavorites = await h.getFavorites();
    expect(Array.isArray(oldFavorites)).toBe(true);

    const noti = (await h.getNotificationList(courseTester!)).find((n) => !oldFavorites.find((f) => f.id === n.id));
    const hw = (await h.getHomeworkList(courseTester!)).find((item) => !oldFavorites.find((f) => f.id === item.id));
    const file = (await h.getFileList(courseTester!)).find((f) => !oldFavorites.find((fav) => fav.id === f.id));
    const discuss = (await h.getDiscussionList(courseTester!)).find((d) => !oldFavorites.find((f) => f.id === d.id));
    if (noti) await h.addToFavorites(ContentType.NOTIFICATION, noti.id);
    if (hw) await h.addToFavorites(ContentType.HOMEWORK, hw.id);
    if (file) await h.addToFavorites(ContentType.FILE, file.id);
    if (discuss) await h.addToFavorites(ContentType.DISCUSSION, discuss.id);
    const pinned = noti || hw || file || discuss;
    if (pinned) await h.pinFavoriteItem(pinned.id);

    const newFavorites = await h.getFavorites();
    const addedFavorites = newFavorites.filter((f) => !oldFavorites.find((of) => of.id === f.id));

    if (pinned) {
      const i = addedFavorites.findIndex((f) => f.id === pinned.id);
      expect(i).toBe(0);
      expect(addedFavorites[i].pinned).toBeTruthy();
      await h.unpinFavoriteItem(pinned.id);
    }

    if (noti) {
      expect(addedFavorites.find((f) => f.type === ContentType.NOTIFICATION && f.id === noti.id)).toBeDefined();
      await h.removeFromFavorites(noti.id);
    }
    if (hw) {
      expect(addedFavorites.find((f) => f.type === ContentType.HOMEWORK && f.id === hw.id)).toBeDefined();
      await h.removeFromFavorites(hw.id);
    }
    if (file) {
      expect(addedFavorites.find((f) => f.type === ContentType.FILE && f.id === file.id)).toBeDefined();
      await h.removeFromFavorites(file.id);
    }
    if (discuss) {
      expect(addedFavorites.find((f) => f.type === ContentType.DISCUSSION && f.id === discuss.id)).toBeDefined();
      await h.removeFromFavorites(discuss.id);
    }
  });
});
