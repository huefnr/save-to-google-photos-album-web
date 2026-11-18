import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const source = fs.readFileSync(new URL("../checkout/checkout.js", import.meta.url), "utf8");
function run({ token = "test_public", query = "?_ptxn=txn_test", sdk = true } = {}) {
  const status = { textContent: "" }, badge = { hidden: true };
  let callback, environment;
  const context = {
    window: { SAVE_TO_ALBUM_CHECKOUT: { environment: "sandbox", clientToken: token } },
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
