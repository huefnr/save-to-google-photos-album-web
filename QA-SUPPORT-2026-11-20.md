# Support Feedback Release - November 20, 2026

## Latest Owner Decision

Earlier J21/J23 requested direct email intake, required reply address and media
uploads. The owner subsequently replaced that workflow with one textarea:
"What was your expectation? What happened instead?", no Issue Type, no Reply-to
Email, and exactly Open Email Draft / Copy Email Draft. This latest decision
supersedes the earlier form requirements. No Short Summary is present.

## Behavior

- Drafts address contact@autonomousaffairs.com with a fixed product-support
  subject; arbitrary Unicode and punctuation remain intact in the encoded body.
- Copy includes To, Subject and message without opening an email app. Both
  actions require a nonblank message. Copy failure preserves input and retry.
- The page makes no support API call and never claims a draft was sent.
- Files must be added in the email app; there is no nonfunctional upload input.
- Refund headings/contact cleanup from J21 is included. Privacy's support
  paragraph now describes only the deployed draft behavior. Other candidate
  billing, deletion, checkout and account changes are not included.
- Website AGENTS.md records the latest form and copy contract.

## Verification

- Seven production-script support tests pass, including clipboard denial,
  pending duplicate clicks, blank validation, Unicode and no network submission.
- Neighboring checkout tests pass: 15 tests combined.
- Browser suite: 24 page/viewport checks at 360, 390 and 1280 pixels, including
  support layout, required message, copy success/refusal and preserved content.
- Earlier direct-mail prototype test was actually received with its PNG in the
  owner's iCloud Junk folder (case 62b79248-363f-4b8f-a843-0f7b36aadbbe).
  This proves delivery, not inbox placement. The owner supplied the receipt.
  After the latest draft decision, the temporary standalone support Worker was
  deleted. Existing billing Workers were never modified or deployed.
- No account deletion, Paddle charge, subscription or production DB change.

Only the reviewed support/refund/privacy/style subset is released from an
isolated worktree based on the public price-only commit 283ec3f.
