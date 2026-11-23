import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import {createHash} from 'node:crypto';

const source = fs.readFileSync(new URL("../checkout/checkout.js", import.meta.url), "utf8");
test('annual checkout price suffix stays inline without wrapping',()=>{
  const css=fs.readFileSync(new URL('../styles.css',import.meta.url),'utf8');
  assert.match(css,/\.checkout-price\s*\{[^}]*white-space:\s*nowrap/);
  assert.match(css,/\.checkout-price span\s*\{[^}]*display:\s*inline\s*;/);
});
test('all shared stylesheet URLs change with CSS contents to invalidate old browser caches',()=>{
  const css=fs.readFileSync(new URL('../styles.css',import.meta.url));
  const revision=createHash('sha256').update(css).digest('hex').slice(0,12);
  for(const file of ['../index.html','../faq/index.html','../privacy/index.html',
    '../terms/index.html','../refunds/index.html','../support/index.html',
    '../checkout/index.html','../checkout/live-test/index.html']){
    const html=fs.readFileSync(new URL(file,import.meta.url),'utf8');
    const href=html.match(/href="([^"]*styles\.css[^"]*)"/)[1];
    assert.equal(new URL(href,'https://save-to-album.com/checkout/').searchParams.get('v'),revision,file);
  }
});
function run({ token = "test_public", query = "?_ptxn=txn_test", sdk = true, mode = "sandbox", missingTransactionMessage } = {}) {
  const status = { textContent: "" }, badge = { hidden: true };
  let callback, environment;
  const context = {
    window: { SAVE_TO_ALBUM_CHECKOUT: { environment: mode, clientToken: token, missingTransactionMessage } },
    location: { search: query }, URLSearchParams,
    document: { querySelector: name => name === "#status" ? status : badge },
    ...(sdk ? { Paddle: { Environment: { set: value => { environment = value; } },
      Initialize: options => { callback = options.eventCallback; assert.equal(options.token, token); } } } : {})
  };
  vm.runInNewContext(source, context);
  return { status, badge, emit: name => callback({ name }), environment };
}

test("sandbox checkout initializes only with a transaction and shows a test label", () => {
  const r = run();
  assert.equal(r.environment, "sandbox"); assert.equal(r.badge.hidden, false);
  assert.match(r.status.textContent, /opening/);
});
test("closing a completed checkout preserves success instead of overwriting it", () => {
  const r = run(); r.emit("checkout.completed"); r.emit("checkout.closed");
  assert.match(r.status.textContent, /Payment complete/);
});
test("decline and checkout errors do not report success", () => {
  const r = run(); r.emit("checkout.payment.failed"); assert.match(r.status.textContent, /wasn't completed/);
  r.emit("checkout.error"); assert.match(r.status.textContent, /Couldn't open/);
  r.emit("checkout.closed"); assert.match(r.status.textContent, /Checkout closed/);
});
test("missing token, transaction or SDK produce clear non-success states", () => {
  assert.match(run({ token: "" }).status.textContent, /isn't available/);
  assert.match(run({ query: "" }).status.textContent, /Manage Plan/);
  assert.match(run({ sdk: false }).status.textContent, /Couldn't open/);
});

test("isolated Live checkout does not enable Sandbox or show a no-real-charges label", () => {
  const r = run({ mode: "live", token: "live_public" });
  assert.equal(r.environment, undefined);
  assert.equal(r.badge.hidden, true);
  assert.match(r.status.textContent, /opening/);
  assert.match(run({ query: "", missingTransactionMessage: "Open your trial link." }).status.textContent, /Open your trial link/);
});

test("public and isolated checkout configuration stay in separate environments", () => {
  const sandbox = {}, live = {};
  vm.runInNewContext(fs.readFileSync(new URL("../checkout/config.js", import.meta.url), "utf8"), { window: sandbox, Object });
  vm.runInNewContext(fs.readFileSync(new URL("../checkout/live-test/config.js", import.meta.url), "utf8"), { window: live, Object });
  assert.equal(sandbox.SAVE_TO_ALBUM_CHECKOUT.environment, "sandbox");
  assert.match(sandbox.SAVE_TO_ALBUM_CHECKOUT.clientToken, /^test_/);
  assert.equal(live.SAVE_TO_ALBUM_CHECKOUT.environment, "live");
  assert.match(live.SAVE_TO_ALBUM_CHECKOUT.clientToken, /^live_/);
});
