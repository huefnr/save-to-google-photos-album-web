# Website Copy and Release Rules

- Use Basic plan / Plus plan in explanatory prose. Compact plan headings and
  actual product names may retain official capitalization; do not rename code
  enum values or product identifiers to satisfy a copy rule.
- Section headings use Title Case, e.g. Operator and Availability. Legal copy
  is country-neutral and links Pricing/checkout instead of duplicating mutable
  numeric prices or trial durations. Preserve mandatory consumer rights and
  conditional renewal-consent requirements.
- Every policy-text change must update that page's Last updated date to the
  actual revision date and include a test for it. Do not change dates on every
  build or claim that unmodified historical text was newly reviewed.
- A public launch task must update prelaunch copy across Home, Terms, Refunds,
  Privacy, Checkout and README in the same release. Replace not yet open,
  coming soon, planned subscription/service and when Plus launches with wording
  that truthfully describes the launched service and Paddle's actual role.
  Do not change availability claims before explicit launch authorization.
- Before public launch, run PUBLIC_LAUNCH=1 node scripts/test-launch-copy.mjs;
  the launch must not proceed while that gate fails. Also run
  node scripts/test-launch-copy.mjs and scripts/test-policy-pages.mjs for copy
  releases, then verify the deployed URLs. A successful local run is not proof
  of publication; inspect actual deployment status and fetched HTML.
- Never publish unrelated dirty candidate features. Start from the current
  deployed branch in an isolated worktree and stage only reviewed release files.
- Price-line fixes must pass `scripts/test-annual-price-line.mjs` locally and
  again with `--base-url=https://save-to-album.com` after public deployment.
  Check text-range geometry at desktop/mobile widths, not just matching markup
  or a locally modified stylesheet. Layout verification must not execute checkout
  scripts, reopen a transaction or change billing environment/enablement.
