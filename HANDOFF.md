# ZikriLLah — Engineering & Deployment Handoff

**Release:** 0.18.0 · **Prepared:** 10 October 2026  
**Production:** https://zikrillah.duckdns.org  
**Repository:** https://github.com/itjmu/ZikriLLah

## 1. What this release delivers

| Area | Behavior |
| --- | --- |
| Controls | Smaller 48 dp menu button in Android; smaller central counter and larger surrounding beads. Web follows the same proportions. |
| Dhikr text | Up to three visible Arabic lines and three translation/transcription lines. Longer text remains saved in the editor. |
| Creation | Any one of name, Arabic, or translation/transcription is enough. When name is blank, a short display name is derived from the supplied text. |
| Editing | Long-press a dhikr title to edit. Use the separate ⠿ handle to reorder. Web also has an explicit edit button; Telegram has Edit text under each dhikr's management menu. |
| Built-in corrections | Stored as personal overrides under the same dhikr ID; never change another user's catalog or discard count history. |
| Synchronization | New and edited dhikrs travel between APK, web and bot under the same authenticated Telegram account. Online APK/web creation and edits request synchronization immediately. Other clients receive changes on their next sync. No sync request is made for every tap. |
| Resets | Red Today and Last 7 days buttons with confirmation. A reset applies to all dhikrs in the chosen period, across the account, up to the confirmation cutoff. New taps after that cutoff remain. |

The normal automatic sync policy remains confirmed exit when online, daily network-available sync, and unrestricted manual sync from the Telegram/account button. Metadata edits and resets additionally request an immediate online sync. Offline changes remain in local storage.

## 2. Architecture and ownership

This is a monorepo with separate components:

| Directory | Responsibility |
| --- | --- |
| bot/ | Telegram transport, counting menus, reminders, publications, broadcasts and admin controls. |
| server/ | HTTP API, authentication, SQLite persistence and per-account sync. |
| web/ | Mobile web/Telegram Mini App, offline cache and shared pure JavaScript logic. |
| android/ | Native Java Android app, SQLite offline history, alarms, haptics and background jobs. |
| test/ | Node integration and unit tests. |
| scripts/ | Android build and launcher-image preparation. |

Production runs **one Node process for bot + API**, serving the web assets. Android is built and installed separately. Dockerfile and docker-compose.yml are unchanged. Do not split the bot and API into competing processes using the same bot token.

The production server hosts other projects: **change only the ZikriLLah checkout/container/data directory.** Do not alter shared nginx configuration, restart unrelated services, or prune Docker resources.

## 3. Data model and merge contract

### Identity

All three clients must use the same production origin and Telegram user ID. APK connects through the Telegram deep-link approval flow; Mini App identity is verified using Telegram-signed data. Never put BOT_TOKEN in an APK, web bundle, repository or handoff.

Local development uses a separate test bot. Do not replace production .env with the computer's .env.

### Dhikr revisions

The existing custom_zikrs table now also holds personal overrides for built-in/shared IDs. A saved entry contains id, name, arabic, meaning and revision. Revision is a 13-digit millisecond timestamp followed by a UUID; lexicographically newer revisions win. Old entries without revisions remain readable. Stale unversioned copies cannot overwrite a newer revision. Concurrent edits resolve to one complete winning record; there is no field-by-field merge or editor conflict dialog. Keep device clocks reasonably accurate.

IDs remain stable when text changes. Web and Android merge server and local catalogs by revision instead of always preferring the local copy. There is a 500-entry limit for custom/overridden records; field lengths remain 80 / 500 / 500 characters. Custom dhikr deletion remains separate from statistic resets; built-in dhikrs cannot be deleted.

### Reset ledger

A new SQLite table, stat_resets(user, id, value), stores permanent reset records. Each record contains an ID and inclusive UTC from/to instants. Today starts at the initiating client's local midnight; Last 7 days starts six calendar days earlier. Telegram uses the profile's configured UTC offset. Confirmation in the bot expires after five minutes and cannot be reused.

Server event rows are retained as historical storage, but reset ranges exclude them from synchronized history, bot statistics and rankings. Offline uploads within those ranges are ignored, preventing old devices from restoring cleared counts. Android removes matching local events and rebuilds its count cache; web filters both history and pending events. Other accounts are unaffected.

For accounts with resets, the server returns full filtered history rather than a cursor-only delta. This deliberately prioritizes correctness; large histories may need indexed reset filtering/pagination in a future performance pass. Reset ledgers must not be removed independently of history. The client API limits each upload to 5,000 events and 5,000 reset records; request body limit remains 2 MB. There is no user-facing undo.

### API compatibility

POST /api/sync remains authenticated and now accepts/returns resets; customZikrs entries may include revision and personal built-in overrides. Existing clients may not understand edits/resets correctly: **deploy the backend first, then update APK/web clients.** Avoid rolling back to an older backend after accepting new edits or resets.

## 4. Production update — existing Docker deployment

Run these commands inside the existing ZikriLLah checkout. Preserve its production .env and current data volume. First inspect git status and resolve local modifications deliberately; never use git reset --hard.

1. Record the current commit with git rev-parse HEAD and container state with docker compose ps.
2. Stop only this service for a consistent backup:

~~~bash
docker compose stop zikrillah
backup_dir="../zikrillah-backup-$(date +%Y%m%d-%H%M%S)"
mkdir -m 700 "$backup_dir"
cp -a data "$backup_dir/data"
cp -p .env "$backup_dir/.env"
chmod 600 "$backup_dir/.env"
~~~

If this deployment uses a different data volume, back up that actual directory instead. Keep the backup private; it contains user data and secrets.

3. Update and validate only this project:

~~~bash
git status --short
git pull --ff-only
docker compose config --quiet
docker compose build zikrillah
docker compose run --rm --no-deps zikrillah node --check bot/index.js
docker compose up -d zikrillah
docker compose ps
docker compose logs --tail=80 zikrillah
curl --fail http://127.0.0.1:3107/api/config
curl --fail https://zikrillah.duckdns.org/api/content
~~~

Do not print .env or run a verbose compose config in shared logs. Production .env must retain its real BOT_TOKEN and ADMIN_IDS; PUBLIC_URL should be https://zikrillah.duckdns.org. Compose sets HOST=0.0.0.0 inside the container, PORT=3107, DATA_DIR=/app/data, BOT_API_ENABLED=1. Only 127.0.0.1:3107 is exposed on the host. Existing HTTPS proxy settings stay unchanged.

The table is created automatically at startup. No manual migration command or npm dependency installation is needed. Node must support node:sqlite; the Docker image uses node:22-slim.

If an update fails before users resume activity, restore the matching previous code and full consistent backup. Once new data has been accepted, reverting the database loses that data; stop and plan a forward fix or reconciled recovery rather than overwriting it blindly.

## 5. Android build and installation

On the configured Windows development machine:

~~~powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/build-android.ps1
~~~

The script uses Java 17 in .tools and the Android SDK in LOCALAPPDATA/Android/Sdk. It runs assembleDebug, testDebugUnitTest and lintDebug, then writes dist/ZikriLLah-debug.apk. This APK is a debug build, not a Play Store release. Preserve the existing signing key to allow installation over the previous version. **Do not uninstall first**, because that removes unsynced local data.

Version is controlled in android/app/build.gradle (versionCode 18, versionName 0.18.0); package.json is also 0.18.0. The supplied launcher image is unchanged. Future admin-uploaded icons still require preparing the resource and rebuilding/installing an APK; see V017-DEPLOYMENT.md.

## 6. Verification and acceptance

Completed validation: 61 Node tests and 15 Android unit tests passed; APK assembly succeeded; Android lint reported 0 errors and 9 warnings. Physical-device acceptance remains the checklist below.

Automated checks: npm test; Android build script above. Relevant new coverage is in test/account-data.test.js and test/bot.test.js: three-client catalog sync, stale edit protection, private built-in overrides, blank-name creation, reset confirmation, stale replay, rankings, account isolation and local date boundaries.

Before calling a production rollout complete, perform these real-device checks:

- Install over the existing APK and confirm old history remains.
- Inspect a small screen with three Arabic and three translation lines; verify the menu remains tappable and beads do not cover text.
- Add an Arabic-only dhikr in APK; sync web and inspect it in the bot. Repeat using only the translation field.
- Long-press and edit a built-in dhikr; verify the correction on the same account's other clients and that another account keeps the original.
- Use ⠿ to reorder; make sure title editing and dragging do not conflict.
- With two clients online and one offline, create counts, confirm Today reset, reconnect the stale client and verify the counts do not return. Confirm a new tap after reset is retained.
- Cancel both reset dialogs and verify no data changes. Repeat a confirmed Telegram reset callback and verify it does not apply again.
- Verify the Last 7 days boundary and the bot profile's timezone; older counts must stay.
- Update/reload the web app and verify its service worker caches account-data.js for offline startup.

The current environment provides automated build/tests, not proof of behavior on every physical Android device or launcher. Production deployment is performed by the server administrator, not by this development session.

## 7. Existing limitations to retain in future work

- Instant admin push while APK is closed still needs Firebase integration. Open APK polls notices; closed APK receives them at sync.
- Exact daily offline reminders require notification and exact-alarm permission; manufacturer battery policies may delay them.
- Telegram can reject deletion of old chat messages. /start cleans tracked recent replies, not arbitrary unlimited history.
- Browser restrictions may prevent window.close; the web app then asks the user to close the tab.
- Edits to built-in dhikrs are personal, not editorial changes to the shared catalog.
- Main-screen text is limited to three visible lines per Arabic/translation field; the full saved text is available in the editor.

## 8. Next maintainer starting points

Start with server/store.js and web/account-data.js for merge/reset behavior; android/.../ZikrStore.java and SyncEngine.java for offline parity; MainActivity.java, ZikrListView.java and web/app.js for UI; bot/handler.js and bot/ui.js for Telegram flows. Read DOCKER.md for the established deployment topology and V017-DEPLOYMENT.md for icon/server migration history. Treat this handoff as the current 0.18 behavior when older documents differ.
