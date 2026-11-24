import assert from 'node:assert/strict';
import fs from 'node:fs';
import {fileURLToPath} from 'node:url';
import path from 'node:path';

const root=fileURLToPath(new URL('../',import.meta.url));
const files=['index.html','terms/index.html','refunds/index.html','privacy/index.html','checkout/index.html','checkout/live-test/index.html','support/index.html','faq/index.html','README.md'];
for(const file of files) {
  const source=fs.readFileSync(path.join(root,file),'utf8');
  for(const paragraph of source.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/g)) {
    const text=paragraph[1].replace(/<[^>]*>/g,'');
    assert.doesNotMatch(text,/\b(?:Basic|Plus)\b(?!\s+[Pp]lan\b)/,`${file}: explanatory prose must use Basic plan / Plus plan`);
  }
  if(['terms/index.html','refunds/index.html','privacy/index.html'].includes(file)) {
    const date=file==='privacy/index.html'?'November 24, 2026':'November 23, 2026';
    assert.ok(source.includes(`Last updated ${date}`),`${file}: record this policy revision date`);
    if(file==='terms/index.html') assert.ok(source.includes(`<p class="updated">Last updated ${date}</p>`),'Terms date line must not repeat the product name');
  }
  if(process.env.PUBLIC_LAUNCH==='1') {
    const visible=source.replace(/<[^>]*>/g,' ');
    assert.doesNotMatch(visible,/not live yet|not yet (?:live|open|available)|coming soon|planned (?:product|paid service|subscription|service|for users)|when (?:the )?Plus(?: plan)? launches|when (?:the )?Plus(?: plan)? becomes available/i,`${file}: remove prelaunch promises before launch`);
  }
  if(file==='privacy/index.html') {
    assert.doesNotMatch(source,/oncuration\.com|chrome\.storage\.local/, 'Privacy must match the submitted session-storage and optional-site model');
    for(const phrase of ['chrome.storage.session','No individual website has a mandatory static guard','trial-use history','one-way fingerprints']) assert.ok(source.includes(phrase),phrase);
  }
}
console.log(`PASS: plan names and policy revision dates${process.env.PUBLIC_LAUNCH==='1'?' + launched-copy gate':''}`);
