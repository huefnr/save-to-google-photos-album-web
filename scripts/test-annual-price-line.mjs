import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';

const {chromium}=await import(process.env.PLAYWRIGHT_MODULE
  ? pathToFileURL(process.env.PLAYWRIGHT_MODULE).href:'playwright');
const root=fileURLToPath(new URL('../',import.meta.url));
const remote=process.argv.find(value=>value.startsWith('--base-url='))?.slice(11);
let server,browser;
try {
  if(!remote){
    server=http.createServer(async(req,res)=>{
      try{
        const url=new URL(req.url,'http://localhost');
        let file=path.resolve(root,'.'+url.pathname);
        if(!file.startsWith(root))throw new Error('Outside root');
        if(url.pathname.endsWith('/'))file=path.join(file,'index.html');
        res.setHeader('Content-Type',({'.html':'text/html','.css':'text/css','.png':'image/png'})[path.extname(file)]||'application/octet-stream');
        res.end(await fs.readFile(file));
      }catch{res.writeHead(404).end();}
    });
    await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  }
  const base=remote||`http://127.0.0.1:${server.address().port}`;
  browser=await chromium.launch({headless:true,channel:'chrome'});
  const page=await browser.newPage();
  // Layout-only verification never loads Paddle or executes checkout code.
  await page.route('**/*',route=>route.request().resourceType()==='script'
    || new URL(route.request().url()).origin!==new URL(base).origin?route.abort():route.continue());
  for(const endpoint of ['/checkout/','/checkout/live-test/'])for(const width of [1280,768,390,320]){
    await page.setViewportSize({width,height:1000});
    await page.goto(new URL(endpoint,base).href);
    const boxes=await page.locator('#checkout-price').evaluate(el=>{
      const range=document.createRange();range.selectNodeContents(el.firstChild);
      const amount=range.getBoundingClientRect(),suffix=el.querySelector('span').getBoundingClientRect();
      return {amount:{top:amount.top,bottom:amount.bottom,right:amount.right},
        suffix:{top:suffix.top,bottom:suffix.bottom,left:suffix.left,right:suffix.right},
        viewport:innerWidth,overflow:document.documentElement.scrollWidth>innerWidth};
    });
    assert.ok(boxes.amount.top<boxes.suffix.bottom && boxes.suffix.top<boxes.amount.bottom,
      `${endpoint} ${width}px: amount and annual suffix must share a text line`);
    assert.ok(boxes.suffix.left>=boxes.amount.right-1 && boxes.suffix.right<=boxes.viewport,
      `${endpoint} ${width}px: suffix must follow the amount and fit`);
    assert.equal(boxes.overflow,false,`${endpoint} ${width}px: no horizontal overflow`);
    if(width===1280){
      const out='/tmp/save-to-album-price-line';await fs.mkdir(out,{recursive:true});
      await page.screenshot({path:path.join(out,endpoint.includes('live-test')?'live.png':'checkout.png')});
    }
  }
  console.log(`PASS: 8 annual-price line layouts (${remote?'deployed':'local'}); no checkout scripts executed`);
}finally{
  await browser?.close();if(server)await new Promise(resolve=>server.close(resolve));
}
