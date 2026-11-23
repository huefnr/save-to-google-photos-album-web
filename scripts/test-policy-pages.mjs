import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';

const root=fileURLToPath(new URL('../',import.meta.url));
const output=process.env.QA_OUTPUT || '/tmp/save-to-album-policy-qa';
await fs.mkdir(output,{recursive:true});
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE ? pathToFileURL(process.env.PLAYWRIGHT_MODULE).href : 'playwright');
let server;
if(!process.env.QA_BASE_URL) {
  server=http.createServer(async(req,res)=>{
    try {
      const url=new URL(req.url,'http://localhost');
      let file=path.resolve(root,'.'+decodeURIComponent(url.pathname));
      if(file!==path.resolve(root)&&!file.startsWith(root))throw Error('Invalid path');
      if((await fs.stat(file)).isDirectory())file=path.join(file,'index.html');
      res.setHeader('Content-Type',({'.html':'text/html','.css':'text/css','.js':'text/javascript','.svg':'image/svg+xml','.png':'image/png'})[path.extname(file)]||'application/octet-stream');
      res.end(await fs.readFile(file));
    }catch{res.writeHead(404).end();}
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
}
const base=(process.env.QA_BASE_URL || `http://127.0.0.1:${server.address().port}`).replace(/\/$/,'');
const minor=new Set(['and','or','the','of','to','for','a','an','in','on','from','by','with']);
let browser,checks=0;
try {
  browser=await chromium.launch({headless:true,channel:process.env.CHROME_CHANNEL||'chrome'});
  for(const width of [390,1280]) {
    const page=await browser.newPage({viewport:{width,height:900}});
    await page.route('**/*',route=>route.request().url().startsWith(base)?route.continue():route.abort());
    for(const pathname of ['/terms/','/refunds/','/privacy/','/faq/','/','/checkout/']) {
      assert.equal((await page.goto(base+pathname)).status(),200);
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,pathname+' overflow');
      const main=await page.locator('main').innerText();
      if(['/terms/','/refunds/','/privacy/'].includes(pathname)) {
        assert.doesNotMatch(main,/South Korea|South Korean|registered sole proprietorship/);
        for(const heading of await page.locator('main h2').allTextContents())for(const word of heading.split(/\s+/)) {
          assert.ok(minor.has(word)||/^[A-Z]/.test(word),'Heading must use Title Case: '+heading);
        }
        if(pathname!='/privacy/') {
          assert.doesNotMatch(main,/\b\d+-day (?:free )?trial|USD\s*\d|\$\d/);
          assert.ok(await page.locator('article a[href="../#plans"]').count()>0);
          assert.match(main,/rights/i);
        }
        if(pathname==='/terms/') {
          assert.match(main,/subject to any required renewal consent/);
          assert.match(main,/without that consent/);
          assert.match(main,/price and billing interval displayed at checkout apply/);
        }
      }else if(pathname!='/faq/') {
        assert.match(main,/14-day free trial/);
        assert.doesNotMatch(main,/7-day free trial/);
      }
      if(pathname==='/faq/'||pathname==='/refunds/') {
        assert.match(main,/within 14 days of the transaction date for a discretionary refund/);
        assert.match(main,/Approval is not guaranteed/);
        assert.match(main,/Statutory withdrawal and defect rights may have different deadlines and take precedence/);
        const request=pathname==='/faq/'?page.locator('section[aria-labelledby="refund-request"]'):page.locator('article');
        assert.match(await request.innerText(),/Paddle.net and choose Request refund/);
        assert.equal(await request.locator('ol > li').count(),3);
        assert.equal(await request.locator('a[href="https://paddle.net"]').count()>0,true);
        if(pathname==='/refunds/')assert.equal(await page.locator('.updated').innerText(),'Last updated November 23, 2026');
        if(pathname==='/faq/'){
          await page.locator('#questions a[href="#right-click-blocked"]').click();
          assert.equal(new URL(page.url()).hash, '#right-click-blocked');
          const answer = page.locator('section[aria-labelledby="right-click-blocked"]');
          assert.match(await answer.innerText(), /Settings.*Image Access.*Automatically Unblock Right-Click/s);
          assert.match(await answer.innerText(), /off by default/);
          assert.equal(await page.locator('a[href="#questions"]').count(),0);
          assert.doesNotMatch(main,/Back to Questions/);
          await page.locator('#questions a[href="#refund-request"]').click();
          const heading=await page.locator('#refund-request').boundingBox();
          assert.ok(heading.y>=0&&heading.y+heading.height<=900);
        }
      }
      const links=await page.locator('a[href]').evaluateAll(nodes=>nodes.map(el=>el.href));
      for(const href of new Set(links.filter(href=>href.startsWith(base))))assert.equal((await page.request.get(href)).status(),200,href);
      assert.ok(await page.locator('img').evaluateAll(nodes=>nodes.every(el=>el.complete&&el.naturalWidth>0)));
      await page.screenshot({path:path.join(output,`${pathname==='/'?'home':pathname.split('/')[1]}-${width}.png`),fullPage:true});
      checks++;
    }
    await page.close();
  }
  console.log(`PASS: ${checks} policy/pricing page-viewport checks at ${base}; screenshots: ${output}`);
}finally {
  await browser?.close();
  if(server)await new Promise(resolve=>server.close(resolve));
}
