const form = document.querySelector("#issueForm");
const status = document.querySelector("#formStatus");
const copyButton = document.querySelector("#copyDraft");
const recipient = "contact@autonomousaffairs.com";
const subject = "Save to Google Photos Album Support Request";
let copying = false;

function reportDetails(message) {
  const suppliedVersion = new URLSearchParams(window.location.search).get("version") || "";
  const version = /^\d{1,3}\.\d{1,3}\.\d{1,3}(?:-[a-zA-Z0-9.-]{1,40})?$/.test(suppliedVersion) ? suppliedVersion : "Not provided";
  const singleLine = value => String(value || "Not provided").replace(/[\x00-\x1f\x7f]/g, " ").slice(0, 512);
  return [
    "Product: Save to Google Photos Album",
    `Extension Version: ${version}`,
    `Browser: ${singleLine(navigator.userAgent)}`,
    `OS/Platform: ${singleLine(navigator.userAgentData?.platform || navigator.platform)}`,
    "", "Message:", message
  ].join("\n");
}

function draftMessage() {
  if (!form.reportValidity()) return null;
  const message = form.elements.message.value.trim();
  if (!message) {
    status.textContent = "Describe your expectation and what happened instead.";
    return null;
  }
  return reportDetails(message);
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const message = draftMessage();
  if (!message) return;
  const query = `subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(message)}`;
  window.location.href = `mailto:${recipient}?${query}`;
  status.textContent = "Send the draft from your email app. No email has been sent by this page.";
});

copyButton.addEventListener("click", async () => {
  if (copying) return;
  const message = draftMessage();
  if (!message) return;
  copying = true;
  copyButton.disabled = true;
  try {
    await navigator.clipboard.writeText(`To: ${recipient}\nSubject: ${subject}\n\n${message}`);
    status.textContent = "Email draft copied. No email has been sent.";
  } catch {
    status.textContent = "Couldn't copy the draft. Your message is still here; try Open Email Draft.";
  } finally {
    copying = false;
    copyButton.disabled = false;
  }
});
