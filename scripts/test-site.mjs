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
  const pages = ["/", "/terms/", "/privacy/", "/refunds/", "/support/", "/checkout/"];
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
        assert.match(await page.locator("#plans").innerText(), /7-day free trial/);
        assert.match(await page.locator("#plans").innerText(), /not yet open for purchase/);
        assert.match(await page.locator("#plans").innerText(), /19\.99/);
      }
      if (pathname === "/checkout/") assert.match(await page.locator("#status").innerText(), /isn't available yet/);
      if (width !== 390) await page.screenshot({ path: `${output}/${pathname.replaceAll("/", "") || "home"}-${width}.png`, fullPage: pathname === "/" });
      checks++;
    }
    assert.deepEqual(faults, []);
    await page.close();
  }
  console.log(`${checks} page/viewport checks passed; links, image loading, pricing and closed checkout verified. Screenshots: ${output}`);
} finally {
  if (browser) await browser.close();
  await new Promise(resolve => server.close(resolve));
}
