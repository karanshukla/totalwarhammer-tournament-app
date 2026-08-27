import { test as base, type BrowserContext } from "@playwright/test";

/**
 * index.html pulls its four webfonts from Google Fonts through a
 * render-blocking <link>, so without this every navigation in the suite waits
 * on a third-party CDN — slow when it is reachable, and a hang when it is not.
 * Nothing here asserts on typography, so the requests are cut at the browser
 * and the suite stays hermetic.
 */
const THIRD_PARTY_FONT_URL = /^https:\/\/fonts\.(googleapis|gstatic)\.com\//;

export const blockThirdPartyFonts = async (
  context: BrowserContext,
): Promise<void> => {
  await context.route(THIRD_PARTY_FONT_URL, (route) => route.abort());
};

/**
 * Import `test` from here rather than from @playwright/test so a spec picks
 * this up automatically. A spec that opens its own context — a second, signed
 * out browser — should call `blockThirdPartyFonts` on it directly.
 */
export const test = base.extend({
  context: async ({ context }, use) => {
    await blockThirdPartyFonts(context);
    await use(context);
  },
});

export { expect } from "@playwright/test";
