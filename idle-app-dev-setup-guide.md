# Idle App — Dev Setup Guide

## 1. What we used

| Piece | Tool | Why |
|---|---|---|
| Native shell for the app | **EAS Build** (`eas build --profile development`) | Builds a custom "dev client" APK in Expo's cloud — no Android Studio needed on Windows. |
| Running JS during development | **Metro** (`npx expo start --dev-client`) | Serves your JS bundle live so you don't rebuild the APK on every code change. |
| Phone ↔ laptop connection | **ngrok tunnel** (via `--tunnel`) | Your phone and laptop weren't reliably reachable over plain LAN, so we tunneled instead. |
| Backend API | **Express + Prisma**, `npm run dev` in `backend/` | Your app's server, listening on port 4000. |
| Exposing the backend | **`npx ngrok http 4000`** | Metro's tunnel only forwards port 8081 (the JS bundler), not your API on 4000 — so the backend needed its *own* tunnel. |
| Database | **Neon** (hosted Postgres) | Where Prisma actually stores users/jobs/etc. |

## 2. The problems we hit, in order, and the fix for each

1. **Metro only listening on `127.0.0.1`** → phone found the server in the list (via your Expo account) but couldn't connect, because `127.0.0.1` on the *phone* means the phone itself.
   **Fix:** ran Metro with `--tunnel` instead of relying on LAN auto-detection.

2. **Login hung forever** → the app was deriving the API URL from Metro's tunnel hostname (`*.exp.direct`), but that tunnel only forwards port 8081, not port 4000 where your backend lives. The request went nowhere and (since there was no fetch timeout) just spun.
   **Fix:** ran a *second*, separate tunnel for the backend: `npx ngrok http 4000`, then pointed `mobile/app.json`'s `extra.apiUrl` at that ngrok URL instead of `localhost:4000`.

3. **`ngrok` command not found** → ngrok wasn't installed/on PATH.
   **Fix:** used `npx ngrok http 4000` (downloads and runs it on the fly) instead of a global install.

4. **ngrok stuck on "Session Status: connecting"** → ngrok v3 requires a free account + authtoken.
   **Fix:** `npx ngrok config add-authtoken <your token>` from the free ngrok dashboard, then retried.

5. **`503`/`500` on login, tunnel working fine** → this one wasn't a networking problem at all. The request was reaching your backend correctly — Prisma just couldn't reach your Neon database (`Can't reach database server at ep-long-night-...neon.tech:5432`).
   **Fix:** refreshed the `DATABASE_URL` in `backend/.env` from Neon's dashboard (the connection string had gone stale/the project needed re-checking) and restarted the backend.

**End state that works:** three terminals running side by side —
- `mobile/`: `npx expo start --dev-client --tunnel`
- `backend/`: `npm run dev`
- a separate ngrok tunnel: `npx ngrok http 4000`, with its URL pasted into `mobile/app.json`'s `extra.apiUrl`.

---

## 3. Running it on another Android phone

Good news: you don't need to rebuild anything for a *different* Android phone — the dev-client APK isn't tied to one device.

1. **Get the APK onto the new phone.** Either:
   - Re-share the EAS build link (`eas build:list` shows past builds, each with a QR/download link), or
   - Just transfer the `.apk` file directly (AirDrop-equivalent, USB, cloud drive, etc.) and enable "install from unknown sources" on that phone too.
2. **Same Wi-Fi isn't required** since you're on tunnel mode — but the new phone does need internet access.
3. **Keep your three terminals running** (Metro `--tunnel`, backend `npm run dev`, ngrok on 4000) — they're shared by any number of phones.
4. Open the dev-client app on the new phone → **Enter URL manually** → paste the same `exp+idle://...exp.direct` tunnel URL (or scan the same QR code Metro is printing).
5. It should bundle and load exactly like your phone did. Logging in will work immediately since `apiUrl` is already pointed at your ngrok backend URL.

If you want a build you *don't* have to keep re-tunneling for every session, see the "LAN mode" note in your earlier fix — but tunnel mode works fine for testing on a handful of devices.

## 4. Running it on an iPhone

This is a bigger step, because iOS dev builds have real constraints ngrok/Android don't:

1. **You need a Mac to build for iOS via EAS, *or* an Apple Developer account ($99/year) that lets EAS build in the cloud without a local Mac.**
   - Free Apple ID: works for iOS Simulator builds only (not a real iPhone).
   - Paid Apple Developer account: works for installing on a real iPhone.
2. **Register the iPhone as a test device**, in your project's `mobile/` folder:
   ```powershell
   eas device:create
   ```
   This opens a link — open it *on the iPhone itself* (Safari), which registers that device's UDID with your Apple account.
3. **Build the iOS dev client:**
   ```powershell
   eas build --profile development --platform ios
   ```
   EAS will prompt you to let it manage your Apple certificates/provisioning automatically — say yes unless you already manage your own.
4. **Install on the iPhone.** Unlike Android, you can't just download an `.ipa` and tap install — EAS will give you a link that installs it directly through Apple's over-the-air mechanism (similar to TestFlight, but instant). Open that link on the iPhone in Safari.
5. **Trust the developer certificate** on the iPhone: Settings → General → VPN & Device Management → trust your developer profile, or the app will refuse to open.
6. **From here on, it's identical to Android:** keep Metro (`--tunnel`), the backend, and the backend's ngrok tunnel running, open the installed dev-client app on the iPhone, and connect to the same tunnel URL.

**One extra iOS-only gotcha to watch for:** iOS is stricter about plain `http://` connections (App Transport Security). Since you're using an `https://` ngrok URL for the API already, you're covered — just don't switch back to a plain `http://192.168.x.x` LAN URL for iOS testing without adding an ATS exception in `app.json`.

---

## Quick reference: startup order every session

```powershell
# Terminal 1 — backend
cd C:\Users\Mutale\Desktop\idle-app\backend
npm run dev

# Terminal 2 — expose the backend
npx ngrok http 4000
# copy the https://...ngrok-free.dev URL it prints

# Then paste that URL into mobile/app.json -> extra.apiUrl

# Terminal 3 — start the app
cd C:\Users\Mutale\Desktop\idle-app\mobile
npx expo start --dev-client --tunnel -c
```

Remember: the free ngrok URL changes every time you restart it, so `apiUrl` needs updating each session unless you switch to a paid ngrok static domain or fix LAN mode.
