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
console.log('PASS: Right-click FAQ navigation, option, permission, availability and limitations.');
