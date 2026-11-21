import assert from 'node:assert/strict';
import fs from 'node:fs';
import {fileURLToPath} from 'node:url';
import path from 'node:path';

const root=fileURLToPath(new URL('../',import.meta.url));
const files=['index.html','terms/index.html','refunds/index.html','privacy/index.html','checkout/index.html','README.md'];
for(const file of files) {
  const source=fs.readFileSync(path.join(root,file),'utf8');
  for(const paragraph of source.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/g)) {
    const text=paragraph[1].replace(/<[^>]*>/g,'');
    assert.doesNotMatch(text,/\b(?:Basic|Plus)\b(?!\s+[Pp]lan\b)/,`${file}: explanatory prose must use Basic plan / Plus plan`);
  }
  if(['terms/index.html','refunds/index.html','privacy/index.html'].includes(file)) {
    assert.match(source,/Last updated November 21, 2026/,`${file}: record this policy revision date`);
  }
  if(process.env.PUBLIC_LAUNCH==='1') {
    const visible=source.replace(/<[^>]*>/g,' ');
    assert.doesNotMatch(visible,/not yet open|coming soon|planned (?:paid service|subscription)|when (?:the )?Plus(?: plan)? launches|when (?:the )?Plus(?: plan)? becomes available/i,`${file}: remove prelaunch promises before launch`);
  }
}
console.log(`PASS: plan names and policy revision dates${process.env.PUBLIC_LAUNCH==='1'?' + launched-copy gate':''}`);
