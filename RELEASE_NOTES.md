# KampongSelect - v1.0.0 Release Notes

Welcome to **KampongSelect v1.0.0**, the premium Club OS for Kampong Cricket Club.

## 🚀 Scope of Release

This release transitions KampongSelect from a basic selection tool into a comprehensive, production-ready club management system.

### Player Experience

- **Wide-Screen Hub:** The player view is now a fully responsive 2-column grid on desktop, maintaining the high-touch swipeable card feel on mobile.
- **Season Planner:** Players can set availability for the next 8 weekends in advance.
- **Full Schedule Access:** Players can browse all 158 club fixtures for the 2026 season.
- **Selection Match Card:** When picked, players see a premium "Match Card" with venue details, meet-up times, and a one-click Google Maps link.

### Captain's Power Suite

- **Live Squad Balance:** A real-time counter at the top of the screen shows exactly how many Batters, Bowlers, Keepers, and All-rounders have been selected.
- **Total Selection Freedom:** Captains can now select _any_ active player, regardless of whether they marked themselves available. A new "Traffic Light" indicator (Green/Red/Grey) shows the player's true response intent.
- **Provisional Locks:** Lower-tier captains (e.g., Kampong 2) can see players that higher-tier teams have "Drafted" but not yet confirmed, preventing selection conflicts.
- **High-Visibility Notes:** Player availability notes (e.g., "Need to leave at 4 PM") are highlighted in a prominent amber box.
- **WhatsApp Briefing Generator:** One click generates a formatted squad list and match details ready to paste into team WhatsApp groups.

### Admin Command Centre

- **War Room Timeline:** A horizontal weekend timeline showing team fixture progress (Open, Selecting, Confirmed) and highlighting player double-bookings with red alerts.
- **Cascade Waterfall:** Visual flow showing how the player pool drains as H1 picks their 11, passing the remainder down to H2.
- **Squad Intel & Manual Overrides:** Admins can manually override a player's availability (Yes → No → Excused → Clear) by clicking their reliability score.
- **The Pulse (Notifications):** Admins can "Nudge" all non-responders with a single click, sending automated reminder emails via Resend.

## ⚠️ Known Limitations

- **Fixture Management:** While Admins can add matches via the UI, bulk importing/editing of fixtures requires using the `scripts/sync-fixtures.ts` script or direct database access.
- **Notifications Log:** Notification delivery status is logged to the database (`notification_log`), but there is currently no UI to view these logs. Admins must query the database to audit email delivery failures.
- **Player Profile Editing:** Admins can Activate/Deactivate players, but editing names/emails requires a database update.

## 📋 Post-Release Backlog

- [ ] Add UI for viewing `notification_log` errors.
- [ ] Implement a "Match Report" flow for captains to submit scores and top performers after the game.
- [ ] Add full CRUD forms for editing player profiles (email, tier, role) directly in the Admin Roster tab.
- [ ] PDF export for KNCB official team sheets.
