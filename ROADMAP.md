# Idle — Roadmap

This file is the single source of truth for "what are we working on right
now." Update the status as we go. Only one thing should ever be "🔨 In
Progress" at a time.

## 🔨 In Progress
- **Get test data seeding + app running end-to-end** — blocked on Neon
  cold-start connectivity, being retried now.

## ⏭️ Next Up (in order)
1. **Forgot password / change password** — there is currently *no* way to
   reset a forgotten password, and no "change password while logged in"
   option either. This is a real gap, not a nice-to-have — moving it to the
   front of the feature queue.
2. **Job-site photo upload on posting** — let a hirer attach 1+ photos of
   the actual space/area when posting a job, so a worker can see what
   they're bidding on before committing. Shown on the job detail screen
   alongside the description.
3. **Multi-worker job assignment** — fix the schema/logic gap so a job
   asking for 3 workers can actually accept 3 separate bids, not just one.
4. **Settings page** — consolidate Appearance (currently oversized on
   Profile), Legal docs, and the new Language setting into one place;
   shrink Appearance down to a small toggle/icon.
5. **Language setting** — a real language switcher, likely starting with
   the UI strings extracted into a translation-ready format.
6. **Job expiry ("lifetime")** — let a hirer set how long a post stays
   open when creating it, auto-close after that.
7. **Delete job + notify applicants** — hirer can delete a post; anyone
   who bid gets notified it's gone instead of waiting indefinitely.
8. **Profile: jobs posted / jobs worked** — a tab showing both, with
   posted jobs showing which applicants were accepted.

## 📋 Backlog (not yet ordered — from the "what could we add" list)
- Real push notifications (currently console-log only)
- Real payment processor (escrow is currently mocked)
- Fuzzed job location until a bid is accepted (safety gap)
- Map view of the feed
- Saved jobs / saved searches with alerts
- Recurring job posts
- Tipping
- Employment history / references on profile
- Premium tier + weekly bid limits
- Overall satisfaction percentage on profile

## ✅ Done
- Categories updated to the new list, centralized in one file
- Back button on Register screen
- Password show/hide toggle (shared across all password fields)
- Test accounts (test1/test2/test3) + varied job post seed data
- Manual test plan (see `TEST_PLAN.md`)
- Real-name note + verification pointer on registration
- LAN-IP auto-detection for the mobile app's API calls (fixes physical
  device testing)
- Leaked-credentials file removed from git history
- Invisible portfolio watermark ("heraway")
