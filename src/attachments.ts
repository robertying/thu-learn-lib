// Attachments linked from a Web Learning page (homework and notice detail pages).

import type { PreviewContentType } from './codes.ts';
import type { Session } from './request.ts';
import type { CourseType, RemoteFile } from './types.ts';
import * as URLS from './urls.ts';

export interface AttachmentLink {
  /** the link's `href`: a download link, or a link to the file viewer with the download path in `downloadUrl` */
  href: string;
  /** the query parameter of `href` that holds the file id (`wjid`, `fileId`) */
  idParam: string;
  name: string;
  size: string;
  type: PreviewContentType;
  courseType: CourseType;
}

/** the `RemoteFile` of an attachment link; `undefined` when its download URL isn't on Web Learning */
export function attachmentOf(s: Session, link: AttachmentLink): RemoteFile | undefined {
  let params: URLSearchParams;
  try {
    params = new URL(link.href, URLS.LEARN_PREFIX).searchParams;
  } catch {
    return undefined;
  }
  const downloadUrl = URLS.learnUrl(params.get('downloadUrl') ?? link.href);
  if (!downloadUrl) return undefined;
  const id = params.get(link.idParam) ?? '';
  return {
    id,
    name: link.name,
    downloadUrl,
    previewUrl: URLS.LEARN_FILE_PREVIEW(link.type, id, link.courseType, s.previewFirstPage),
    size: link.size,
  };
}
