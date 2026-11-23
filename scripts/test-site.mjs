import assert from "node:assert/strict";
import fs from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE
  ? pathToFileURL(process.env.PLAYWRIGHT_MODULE).href : "playwright");
const root = fileURLToPath(new URL("../", import.meta.url));
const output = process.env.QA_OUTPUT || "/tmp/save-to-album-site-qa";
await fs.mkdir(output, { recursive: true });
const server = http.createServer(async (request, response) => {
  try {
    const url = new URL(request.url, "http://localhost");
    let file = path.resolve(root, `.${decodeURIComponent(url.pathname)}`);
    if ((file !== path.resolve(root) && !file.startsWith(root)) || url.pathname.split("/").some(part => part.startsWith("."))) throw new Error("Invalid path");
    if ((await fs.stat(file)).isDirectory()) file = path.join(file, "index.html");
    const bytes = await fs.readFile(file);
    response.setHeader("Content-Type", ({ ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".png": "image/png" })[path.extname(file)] || "application/octet-stream");
    response.end(bytes);
  } catch { response.writeHead(404).end(); }
});
await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
let browser;
let checks = 0;
try {
  browser = await chromium.launch({ headless: true, ...(process.env.CHROME_CHANNEL ? { channel: process.env.CHROME_CHANNEL } : {}) });
  const base = `http://127.0.0.1:${server.address().port}`;
  const pages = ["/", "/faq/", "/terms/", "/privacy/", "/refunds/", "/support/", "/checkout/", "/checkout/live-test/"];
  for (const width of [360, 390, 1280]) {
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    const faults = [];
    page.on("pageerror", error => faults.push(error.message));
    await page.route("**/*", route => route.request().url().startsWith(base) ? route.continue() : route.abort());
    for (const pathname of pages) {
      assert.equal((await page.goto(base + pathname)).status(), 200);
      await page.locator("h1").waitFor();
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `${pathname} overflows at ${width}`);
      const links = await page.locator("a[href]").evaluateAll(nodes => nodes.map(node => node.href));
      for (const href of new Set(links.filter(href => href.startsWith(base)))) {
        assert.equal((await page.request.get(href)).status(), 200, `Broken link: ${href}`);
      }
      assert.equal(await page.locator('footer a[href*="refunds"], footer a[href="./"]').count() > 0, true);
      const images = await page.locator("img").evaluateAll(nodes => nodes.every(node => node.complete && node.naturalWidth > 0));
      assert.ok(images, `Missing image: ${pathname}`);
      if (pathname === "/") {
        await page.getByRole("heading", { name: "Plans", exact: true }).waitFor();
        assert.match(await page.locator("#plans").innerText(), /14-day free trial/);
        assert.match(await page.locator("#plans").innerText(), /Upgrade to Plus plan from the extension after signing in/);
        assert.match(await page.locator("#plans").innerText(), /19\.99/);
        assert.equal(await page.locator("#faq").count(), 0);
        assert.equal(await page.locator(".operator-note").innerText(), "Developed and operated by Autonomous Affairs");
        await page.locator('footer a[href="faq/"]').click();
        assert.equal(new URL(page.url()).pathname, "/faq/");
        await page.goto(base);
      }
      if (pathname === "/faq/") {
        const faq = page.locator(".faq-answers");
        assert.equal(await faq.getByRole('link',{name:'Back to Questions'}).count(),0);
        assert.equal(await faq.locator("h2").count(), 9);
        await faq.getByRole("heading", { name: "Can I Save to an Existing Google Photos Album?", exact: true }).waitFor();
        for (const question of [
          "Can I Save Without Choosing an Album?",
          "Why Does the Extension Ask for Website Access?",
          "Why Can't I Right-Click an Image?",
          "Can the Extension See My Existing Photos?",
          "Do I Need a Subscription?",
          "How Do I Request a Refund?",
          "How Long Do I Have to Request a Refund?",
          "Will I Lose My Saved Images If I Uninstall the Extension?"
        ]) await faq.getByRole("heading", { name: question, exact: true }).waitFor();
        assert.equal(await faq.locator('a[href="../privacy/"]').count(), 1);
        assert.equal(await faq.locator('a[href="../#plans"]').count(), 1);
        assert.equal(await page.locator('section[aria-labelledby="existing-albums"] ol > li').count(), 3);
        assert.equal(await page.locator('section[aria-labelledby="refund-request"] ol > li').count(), 3);
        assert.match(await faq.innerText(), /Delete only the old album, not its photos or videos/);
        assert.match(await faq.innerText(), /same name does not connect or merge/);
        assert.match(await faq.innerText(), /Sharing links and comments.*do not transfer/);
        const anchors = await page.locator("#questions a").evaluateAll(nodes => nodes.map(node => node.getAttribute("href")));
        assert.equal(anchors.length, 9);
        for (const anchor of anchors) {
          await page.locator(`#questions a[href="${anchor}"]`).click();
          assert.equal(new URL(page.url()).hash, anchor);
          const target = page.locator(anchor);
          assert.equal(await target.count(), 1);
          const bounds = await target.boundingBox();
          assert.ok(bounds.y >= 0 && bounds.y + bounds.height <= 900, `Anchor not in view: ${anchor}`);
          await page.locator('#questions').scrollIntoViewIfNeeded();
        }
        await page.goto(base + "/faq/#existing-albums");
        await page.locator("#existing-albums").waitFor();
        await page.goto(base + "/faq/");
      }
      if (pathname === "/support/") assert.equal(await page.locator('a[href="../faq/#existing-albums"]').count(), 1);
      if (pathname === "/checkout/") {
        assert.equal(await page.locator("h1").innerText(), "Save to Google Photos Album Plus Plan");
        assert.match(await page.locator("#status").innerText(), /Open checkout from the extension's Manage Plan page/);
        const config = await page.evaluate(() => window.SAVE_TO_ALBUM_CHECKOUT);
        assert.equal(config.environment, "live");
        assert.match(config.clientToken, /^live_[a-z0-9]+$/);
        assert.equal(await page.locator('#test-mode').count(), 0);
      }
      if (pathname === "/checkout/live-test/") {
        assert.equal(await page.locator("h1").innerText(), "Save to Google Photos Album Plus Plan");
        assert.match(await page.locator("#status").innerText(), /Open the checkout link provided for your trial/);
        const config = await page.evaluate(() => window.SAVE_TO_ALBUM_CHECKOUT);
        assert.equal(config.environment, "live");
        assert.match(config.clientToken, /^live_[a-z0-9]+$/);
        assert.match(await page.locator(".renewal-disclosure").innerText(), /live subscription/);
        assert.match(await page.locator(".checkout-panel").innerText(), /Any trial offer is shown at checkout/);
        assert.doesNotMatch(await page.locator(".checkout-panel").innerText(), /7-day free trial/);
        assert.equal(await page.locator("#test-mode").count(), 0);
      }
      if (width !== 390) await page.screenshot({ path: `${output}/${pathname.replaceAll("/", "") || "home"}-${width}.png`, fullPage: pathname === "/" || pathname === "/faq/" });
      checks++;
    }
    assert.deepEqual(faults, []);
    await page.close();
  }
  console.log(`${checks} page/viewport checks passed; links, image loading, pricing and Live-only public checkout entry verified. Screenshots: ${output}`);
} finally {
  if (browser) await browser.close();
  await new Promise(resolve => server.close(resolve));
}
