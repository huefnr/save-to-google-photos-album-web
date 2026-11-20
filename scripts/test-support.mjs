import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const source = fs.readFileSync(new URL("../support/support.js", import.meta.url), "utf8");
const html = fs.readFileSync(new URL("../support/index.html", import.meta.url), "utf8");
function fixture({ valid = true, write = async () => {} } = {}) {
  const events = {}, calls = [];
  const status = { textContent: "" }, copy = { disabled: false, addEventListener: (name, fn) => { events.copy = fn; } };
  const message = { value: " Expected a saved photo. Instead, nothing appeared. " };
  const form = { elements: { message }, reportValidity: () => valid, addEventListener: (name, fn) => { events[name] = fn; } };
  const location = { href: "" };
  vm.runInNewContext(source, { document: { querySelector: selector => ({ "#issueForm": form, "#formStatus": status, "#copyDraft": copy })[selector] },
    window: { location }, navigator: { clipboard: { writeText: text => { calls.push(text); return write(text); } } }, URLSearchParams,
    fetch: () => assert.fail("Drafts must not submit a server request") });
  return { status, copy, message, location, calls, open: () => events.submit({ preventDefault() {} }), copyDraft: () => events.copy() };
}

test("latest owner form has one combined question and exactly two draft actions", () => {
  assert.match(html, /What was your expectation\? What happened instead\?/);
  assert.equal((html.match(/<textarea/g) || []).length, 1);
  assert.doesNotMatch(html, /<select|type="email"|name="category"|name="subject"|name="expected"|Short [Ss]ummary|Reply.to [Ee]mail|Send Request/);
  assert.match(html, />Open Email Draft<\/button>/);
  assert.match(html, />Copy Email Draft<\/button>/);
  assert.match(html, /attachments there/);
});

test("Open Email Draft generates a fixed recipient, subject and encoded combined message without sending", () => {
  const r = fixture(); r.open();
  const url = new URL(r.location.href);
  assert.equal(url.protocol, "mailto:");
  assert.equal(url.pathname, "contact@autonomousaffairs.com");
  assert.equal(url.searchParams.get("subject"), "Save to Google Photos Album Support Request");
  assert.equal(url.searchParams.get("body"), r.message.value.trim());
  assert.match(r.status.textContent, /No email has been sent/);
  assert.equal(r.message.value.startsWith(" "), true);
});

test("special characters and Unicode remain exact in the email draft", () => {
  const r = fixture(); r.message.value = "Expected: A & B + C?\nInstead: 한글 # 100%";
  r.open();
  assert.equal(new URL(r.location.href).searchParams.get("body"), r.message.value);
});

test("Copy Email Draft copies recipient, subject and body without opening email or sending", async () => {
  const r = fixture(); await r.copyDraft();
  assert.equal(r.calls[0], "To: contact@autonomousaffairs.com\nSubject: Save to Google Photos Album Support Request\n\n" + r.message.value.trim());
  assert.equal(r.location.href, "");
  assert.match(r.status.textContent, /copied.*No email has been sent/);
});

test("both actions reject empty or invalid input", async () => {
  for (const valid of [false, true]) {
    const r = fixture({ valid }); r.message.value = "  ";
    r.open(); await r.copyDraft();
    assert.equal(r.location.href, ""); assert.equal(r.calls.length, 0);
  }
});

test("pending copy prevents duplicates, then restores controls", async () => {
  let release;
  const r = fixture({ write: () => new Promise(resolve => { release = resolve; }) });
  const pending = r.copyDraft();
  assert.equal(r.copy.disabled, true); await r.copyDraft();
  assert.equal(r.calls.length, 1); release(); await pending;
  assert.equal(r.copy.disabled, false);
});

test("clipboard refusal preserves message, restores retry and never claims copying succeeded", async () => {
  const r = fixture({ write: async () => { throw Error("denied"); } });
  await r.copyDraft();
  assert.match(r.status.textContent, /Couldn't copy.*Open Email Draft/);
  assert.equal(r.copy.disabled, false);
  assert.match(r.message.value, /Expected a saved photo/);
  r.open(); assert.match(r.location.href, /^mailto:/);
});
