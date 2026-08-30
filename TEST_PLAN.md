# Idle — Manual Test Plan (Round 1)

Accounts: `test1@idle.test`, `test2@idle.test`, `test3@idle.test`, all password `TestPass123`.
Plus your own SUPERADMIN account for admin checks later.

Run these on a physical device with the backend + Metro running. Tick each
off as you go; note anything that breaks with a screenshot if you can.

## 1. Auth
- [ ] Register a brand-new account (not one of the seeded ones) — confirm first/last name, email, password all validate correctly
- [ ] Back button on the register screen returns to Login without crashing
- [ ] "Not now" on the consent screen returns to Login
- [ ] Log in with test1 — confirm the Show/Hide password toggle reveals what was typed
- [ ] Log in with a wrong password — confirm you get a clear error, not a crash
- [ ] Log out and back in

## 2. Posting jobs (as test1)
- [ ] Post one job in each new category — confirm the category picker matches the feed filter
- [ ] Post a job with `workersNeeded` set to 3 (the "Help moving" seed job already has this) — see the note on multi-worker jobs below before testing acceptance
- [ ] Post a job that requires ID verification — confirm it shows a badge/flag on the job card

## 3. Browsing + bidding (as test2 and test3)
- [ ] Browse the feed, filter by each category, confirm counts look right
- [ ] Filter by pay type (fixed/hourly) and by min/max budget
- [ ] Bid on a job as test2
- [ ] Bid on the same job as test3 — confirm both bids show up to the hirer (test1)
- [ ] Try bidding on the ID-verification-required job as an unverified account — confirm you're blocked with the "Verify your identity" message
- [ ] Go to Settings › Verification, complete the (mock) verification flow, then retry bidding on that job

## 4. Accepting a bid (as test1, the hirer)
- [ ] Accept test2's bid — confirm job status flips to Assigned, test3's bid is left as-is (not auto-rejected — check whether that's what you want)
- [ ] Confirm test3 can see the job is no longer open

### ⚠️ Multi-worker jobs — known gap, don't be surprised
The `workersNeeded` field exists and you can post a job asking for e.g. 3
workers, but **accepting a bid still only ever assigns one single worker** —
the schema has one `JobAssignment` per job, one-to-one. So on the 3-worker
moving job: accept one bid, and the job will move to Assigned as if it's
fully staffed, even though 2 more spots are "needed." This isn't a bug in
today's build, it's a feature that hasn't been built yet — multi-worker
jobs need a real schema change (an assignment per worker, not per job) plus
matching UI. Flagging it here so you don't spend time thinking bid #2/#3 are
supposed to also get accepted right now — they're not, yet.

## 5. Working the job (as test2, once assigned)
- [ ] Open the checklist for the job, tick an item, attach a proof photo
- [ ] Mark the job Submitted
- [ ] As test1 (hirer), confirm the job and release/confirm completion
- [ ] Rate each other (stars + like + comment) both directions

## 6. Messaging (test1 ↔ test2, on that job's thread)
- [ ] Send a text message each direction
- [ ] Send an image from test1 to test2
- [ ] Confirm read receipts / unread state behaves as expected
- [ ] (Once media-upload feature ships) try sending a PDF/doc — not supported yet, images only for now

## 7. Profile
- [ ] Check each test account's profile shows rating, likes, verification badge correctly
- [ ] Confirm avgRating updates after the round-6 ratings

## 8. Edge cases worth trying
- [ ] Try to bid on your own job (should be blocked)
- [ ] Try to accept a bid on a job that isn't yours (should be blocked)
- [ ] Cancel a job before it's assigned — confirm bidders are notified (or note if they currently aren't — this ties into the "delete job should notify applicants" feature you asked for, not yet built)
- [ ] Report a user or a job, confirm it lands somewhere reviewable (full admin review UI is a later round)

## 9. Later — Admin round (once we get to it)
- [ ] Log in as SUPERADMIN
- [ ] Suspend/reinstate a test account
- [ ] Force-refund / force-release an escrow
- [ ] Resolve vs. dismiss a report
