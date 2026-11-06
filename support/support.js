const SUPPORT_EMAIL = "support@save-to-album.com";

const form = document.querySelector("#issueForm");
const copyButton = document.querySelector("#copyReport");
const status = document.querySelector("#formStatus");
const params = new URLSearchParams(window.location.search);

form.addEventListener("submit", (event) => {
  event.preventDefault();
  if (!form.reportValidity()) return;

  const report = buildReport();
  const subject = `[${form.elements.category.value}] ${form.elements.subject.value.trim()}`;
  const mailto = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(report)}`;
  status.textContent = "Opening your email app...";
  window.location.href = mailto;
});

copyButton.addEventListener("click", async () => {
  if (!form.reportValidity()) return;

  try {
    await navigator.clipboard.writeText(buildReport());
    status.textContent = "Report copied. Paste it into an email to support@save-to-album.com.";
  } catch (_error) {
    status.textContent = "Copy failed. Select the form text or email support@save-to-album.com directly.";
  }
});

function buildReport() {
  const values = new FormData(form);
  const lines = [
    `Issue type: ${values.get("category")}`,
    `Summary: ${values.get("subject").trim()}`,
    "",
    "What happened:",
    values.get("details").trim(),
    "",
    "Expected:",
    values.get("expected").trim() || "Not provided",
    "",
    `Reply-to: ${values.get("email").trim() || "Not provided"}`
  ];

  if (form.elements.includeTechnical.checked) {
    lines.push(
      "",
      "Technical details:",
      `Extension version: ${cleanParameter(params.get("version")) || "Not provided"}`,
      `Opened from: ${cleanParameter(params.get("source")) || "Website"}`,
      `Browser: ${navigator.userAgent}`
    );
  }

  return lines.join("\n");
}

function cleanParameter(value) {
  return typeof value === "string" ? value.replace(/[^a-zA-Z0-9._-]/g, "").slice(0, 40) : "";
}
