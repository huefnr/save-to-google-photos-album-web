import assert from 'node:assert/strict';
import fs from 'node:fs';

const html = fs.readFileSync(new URL('../faq/index.html', import.meta.url), 'utf8');
assert.match(html, /href="#right-click-blocked">Why Can't I Right-Click an Image\?<\/a>/);
const section = html.match(/<section aria-labelledby="right-click-blocked">([\s\S]*?)<\/section>/)?.[1];
assert.ok(section, 'FAQ needs a linked right-click troubleshooting answer');
for (const copy of ['Settings', 'Image Access', 'Automatically Unblock Right-Click', '0.16.18',
  'all HTTP/HTTPS websites', 'off by default', 'reload', 'custom', 'sign-in', 'paid access']) {
  assert.ok(section.includes(copy), `Missing guidance: ${copy}`);
}
assert.match(section, /Allow All Websites/);
assert.doesNotMatch(html, /Back to Questions|href="#questions"/i);
const privacy = fs.readFileSync(new URL('../privacy/index.html', import.meta.url), 'utf8');
assert.match(privacy, /Last updated November 23, 2026/);
assert.match(privacy, /Automatically Unblock Right-Click/);
assert.match(privacy, /off by default/);
assert.match(privacy, /Turning it off disables automatic guards in existing pages/);
assert.doesNotMatch(privacy, /does not automatically inject scripts into all websites/);
console.log('PASS: Right-click FAQ navigation, option, permission, availability and limitations.');
