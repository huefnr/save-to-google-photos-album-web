const form = document.querySelector("#issueForm");
const status = document.querySelector("#formStatus");
const copyButton = document.querySelector("#copyDraft");
const recipient = "contact@autonomousaffairs.com";
const subject = "Save to Google Photos Album Support Request";
let copying = false;

function draftMessage() {
  if (!form.reportValidity()) return null;
  const message = form.elements.message.value.trim();
  if (!message) {
    status.textContent = "Describe your expectation and what happened instead.";
    return null;
  }
  return message;
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const message = draftMessage();
  if (!message) return;
  const query = new URLSearchParams({ subject, body: message });
  window.location.href = `mailto:${recipient}?${query.toString()}`;
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
