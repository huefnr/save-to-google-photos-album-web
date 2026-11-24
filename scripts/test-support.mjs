import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const source = fs.readFileSync(new URL("../support/support.js", import.meta.url), "utf8");
const html = fs.readFileSync(new URL("../support/index.html", import.meta.url), "utf8");
function fixture({ valid = true, write = async () => {}, search = "?version=0.16.8&source=plans", platform = "MacIntel", userAgent = "Chrome test agent", userAgentData } = {}) {
  const events = {}, calls = [];
  const status = { textContent: "" }, copy = { disabled: false, addEventListener: (name, fn) => { events.copy = fn; } };
  const message = { value: " Expected a saved photo. Instead, nothing appeared. " };
  const form = { elements: { message }, reportValidity: () => valid, addEventListener: (name, fn) => { events[name] = fn; } };
  const location = { href: "", search };
  vm.runInNewContext(source, { document: { querySelector: selector => ({ "#issueForm": form, "#formStatus": status, "#copyDraft": copy })[selector] },
    window: { location }, navigator: { platform, userAgent, userAgentData, clipboard: { writeText: text => { calls.push(text); return write(text); } } }, URLSearchParams,
    fetch: () => assert.fail("Drafts must not submit a server request") });
  return { status, copy, message, location, calls, open: () => events.submit({ preventDefault() {} }), copyDraft: () => events.copy() };
}

test("latest owner form has one combined question and exactly two draft actions", () => {
  assert.match(html, /What was your expectation\? What happened instead\?/);
  assert.equal((html.match(/<textarea/g) || []).length, 1);
  assert.doesNotMatch(html, /<select|type="email"|name="category"|name="subject"|name="expected"|Short [Ss]ummary|Reply.to [Ee]mail|Send Request/);
  assert.match(html, />Open Email Draft<\/button>/);
  assert.match(html, />Copy Email Draft<\/button>/);
  assert.match(html, /<a href="mailto:support@save-to-album\.com">support@save-to-album\.com<\/a>/);
  assert.match(html, /use the form below to write an email draft/);
  assert.doesNotMatch(html + source, /contact@autonomousaffairs\.com/);
  const privacy = fs.readFileSync(new URL("../privacy/index.html", import.meta.url), "utf8");
  assert.doesNotMatch(privacy, /contact@autonomousaffairs\.com/);
  assert.match(privacy, /Last updated November 24, 2026/);
});

test("Open Email Draft generates a fixed recipient, subject and encoded combined message without sending", () => {
  const r = fixture(); r.open();
  const url = new URL(r.location.href);
  assert.equal(url.protocol, "mailto:");
  assert.equal(url.pathname, "support@save-to-album.com");
  assert.equal(url.searchParams.get("subject"), "Save to Google Photos Album Support Request");
  assert.ok(url.searchParams.get("body").endsWith(r.message.value.trim()));
  assert.match(url.searchParams.get("body"), /Product: Save to Google Photos Album/);
  assert.ok(r.location.href.includes("%20"), "Mailto spaces must not use form-style plus encoding");
  assert.match(r.status.textContent, /No email has been sent/);
  assert.equal(r.message.value.startsWith(" "), true);
});

test("special characters and Unicode remain exact in the email draft", () => {
  const r = fixture(); r.message.value = "Expected: A & B + C?\nInstead: 한글 # 100%";
  r.open();
  assert.ok(new URL(r.location.href).searchParams.get("body").endsWith(r.message.value));
});

test("Copy Email Draft copies recipient, subject and body without opening email or sending", async () => {
  const r = fixture(); await r.copyDraft();
  assert.ok(r.calls[0].startsWith("To: support@save-to-album.com\nSubject: Save to Google Photos Album Support Request\n\nProduct: Save to Google Photos Album"));
  assert.ok(r.calls[0].endsWith(r.message.value.trim()));
  assert.equal(r.location.href, "");
  assert.match(r.status.textContent, /copied.*No email has been sent/);
});

test("both draft actions always include identical product, version, browser and OS details without opt-in", async () => {
  const r = fixture({ platform: "Win32", userAgentData: { platform: "Windows" }, userAgent: "Chrome Windows test agent" });
  r.open(); await r.copyDraft();
  const body = new URL(r.location.href).searchParams.get("body");
  for (const text of ["Product: Save to Google Photos Album", "Extension Version: 0.16.8", "Browser: Chrome Windows test agent", "OS/Platform: Windows"]) assert.ok(body.includes(text), text);
  assert.ok(r.calls[0].endsWith(body));
  assert.doesNotMatch(html, /type="checkbox"|Include details/i);
});

test("unknown versions are honest and reports never automatically include URL query secrets", () => {
  for (const version of ["", "0.16.8%0AInjected%3Asecret", "https://private.test/token"]) {
    const r = fixture({ search: "?version=" + version + "&email=private@example.test&token=secret" }); r.open();
    const body = new URL(r.location.href).searchParams.get("body");
    assert.match(body, /Extension Version: Not provided/);
    assert.doesNotMatch(body, /private@example|secret|private\.test|Injected/);
  }
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
