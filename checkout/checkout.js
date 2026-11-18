const config = window.SAVE_TO_ALBUM_CHECKOUT || {};
const statusEl = document.querySelector("#status");
const transactionId = new URLSearchParams(location.search).get("_ptxn");
const unavailableMessage = "Couldn't open secure checkout. Check your connection and try again later. If you already attempted payment, check your subscription in the extension before paying again.";
let completed = false;
const testModeEl = document.querySelector("#test-mode");
if (testModeEl) testModeEl.hidden = config.environment !== "sandbox";

if (!config.clientToken) {
  statusEl.textContent = "Checkout isn't available yet. Return to the extension and try again later.";
} else if (!transactionId) {
  statusEl.textContent = "Open checkout from the extension's Manage Plan page.";
} else {
  try {
    if (!globalThis.Paddle?.Initialize) throw new Error("Checkout failed to load");
    if (config.environment === "sandbox") {
      Paddle.Environment.set("sandbox");
    }
    statusEl.textContent = "Secure checkout is opening…";
    Paddle.Initialize({
      token: config.clientToken,
      eventCallback(event) {
        if (event?.name === "checkout.completed") {
          completed = true;
          statusEl.textContent = "Payment complete. You can return to the extension; Plus will appear after Paddle confirms the subscription.";
        } else if (event?.name === "checkout.closed" && !completed) {
          statusEl.textContent = "Checkout closed. You can return to the extension.";
        } else if (event?.name === "checkout.payment.failed") {
          statusEl.textContent = "The payment wasn't completed. Check your payment details in checkout or try another payment method. If you see a charge, check your subscription before paying again.";
        } else if (event?.name === "checkout.error" || event?.name === "checkout.payment.error") {
          statusEl.textContent = unavailableMessage;
        }
      }
    });
  } catch (_error) {
    statusEl.textContent = unavailableMessage;
  }
  // Paddle automatically opens the transaction identified by the `_ptxn`
  // parameter after initialization on an approved default payment-link page.
}
