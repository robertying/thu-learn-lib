declare module "real-isomorphic-fetch" {
  import Fetch from "cross-fetch";
  import tough from "tough-cookie";

  declare class IsomorphicFetch extends Fetch {
    constructor(fetch: Fetch, jar: tough.CookieJar);
  }

  export default IsomorphicFetch;
}
