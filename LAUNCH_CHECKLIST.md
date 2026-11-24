# Public Launch Copy Gate

Before enabling public purchasing or announcing launch:

- [ ] Explicit owner launch authorization and actual payment setup confirmed.
- [ ] Replace all prelaunch availability statements in Home, Terms, Refunds,
  Privacy, Checkout and README, using Basic plan / Plus plan in prose.
- [ ] Describe Paddle's current merchant-of-record role, not a future promise.
- [ ] Keep price/trial offers on Pricing/checkout, not duplicated in legal pages.
- [ ] Update Last updated only on policies whose text changed, using their
  actual revision date.
- [ ] Run PUBLIC_LAUNCH=1 node scripts/test-launch-copy.mjs. It must pass.
- [ ] Run the policy/pricing browser tests and verify the published URLs after
  deployment. Do not equate a pushed commit with a finished Pages deployment.

The service uses current-operation wording and Live checkout. Run the launched-
copy gate for every copy release, not only the initial launch. The November 24
Privacy candidate matches 0.16.19; publication and Store visibility remain
separate actions. A passing local test is not evidence of a public deployment.
