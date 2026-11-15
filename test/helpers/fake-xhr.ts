import type { Fetch } from '../../src/types.ts';

/** a progress event as XMLHttpRequest's upload sends it */
const progressEvent = (loaded: number, total?: number) =>
  Object.assign(new Event('progress'), { loaded, total: total ?? 0, lengthComputable: total !== undefined });

/**
 * A stand-in for XMLHttpRequest (Node has none) that sends the request with `fetch` (a `FakeServer`'s), reporting the
 * upload progress in `progress` first, or fails with the event in `fail`.
 */
export class FakeXHR extends EventTarget {
  static fetch: Fetch;
  /** [sent, total] for each progress event, total left out when unknown */
  static progress: [number, number?][] = [];
  static fail?: 'error' | 'timeout';
  /** every request sent: method, URL, headers and credentials */
  static sent: { method: string; url: string; headers: Record<string, string>; withCredentials: boolean }[] = [];

  static reset(fetch: Fetch) {
    FakeXHR.fetch = fetch;
    FakeXHR.progress = [];
    FakeXHR.fail = undefined;
    FakeXHR.sent = [];
  }

  readonly upload = new EventTarget();
  withCredentials = false;
  status = 0;
  statusText = '';
  responseText = '';
  responseURL = '';
  #method = 'GET';
  #url = '';
  #headers: Record<string, string> = {};
  #aborted = false;

  open(method: string, url: string) {
    this.#method = method;
    this.#url = url;
  }

  setRequestHeader(name: string, value: string) {
    this.#headers[name] = value;
  }

  abort() {
    this.#aborted = true;
    this.dispatchEvent(new Event('abort'));
  }

  async send(body: BodyInit | null) {
    FakeXHR.sent.push({
      method: this.#method,
      url: this.#url,
      headers: this.#headers,
      withCredentials: this.withCredentials,
    });
    for (const [sent, total] of FakeXHR.progress) this.upload.dispatchEvent(progressEvent(sent, total));
    await Promise.resolve();
    if (this.#aborted) return;
    if (FakeXHR.fail) {
      this.dispatchEvent(new Event(FakeXHR.fail));
      return;
    }
    const res = await FakeXHR.fetch(this.#url, { method: this.#method, body, headers: this.#headers });
    if (this.#aborted) return;
    this.status = res.status;
    this.statusText = res.statusText;
    this.responseText = await res.text();
    this.responseURL = res.url;
    this.dispatchEvent(new Event('load'));
  }
}
