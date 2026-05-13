# KampongSelect - Operations Guide

This guide explains how to use KampongSelect to run the weekly selection cycle for the Kampong Cricket Club.

## Roles

- **Admin (Fixture Secretary):** Manages the entire club's fixtures, roster, and oversees the selection cascade.
- **Captain:** Manages the selection for their specific team (e.g., Kampong 1, Zami 1).
- **Player:** Sets availability and views their match selection.

---

## The Weekly Flow

### 1. Tuesday / Wednesday: Availability Collection

- Players are expected to log in and set their availability using the **Season Planner**.
- **Admin Action:** Check the **War Room** tab to monitor the response rate. If the response rate is low, click **"Nudge Players"** to send an automated reminder via The Pulse (Resend) to anyone who hasn't answered yet.

### 2. Thursday: Competitive Selection (The Cascade)

- **Kampong 1 Captain:** Logs in, reviews the available pool, and picks 11 players. They mark the Captain (⭐) and Wicketkeeper (🛡️). Once satisfied, they click **Confirm XI**.
- **The Pulse Trigger:** Confirming Kampong 1 immediately sends a notification to the Kampong 2 captain: "Your pool is ready."
- **Kampong 2 Captain:** Logs in. They will see players taken by Kampong 1 marked as **Taken · Kampong 1** (greyed out). They pick their 11 and confirm.
- **Kampong 3, 4, 5:** Follow the same process sequentially.

### 3. Thursday/Friday: Recreational Selection

- **Zami 1, Zami 2, Zomi Captains:** Can select their teams at any time. Their player pools are _independent_ of the Kampong 1-5 cascade.
- **Admin Action:** Admins should check the **War Room** for **Double-bookings (Conflicts)**. If a player is picked by both H3 (Sunday) and Zami 1 (Saturday), it will flash as a red alert.

### 4. Friday: Match Briefings

- **Captains Action:** Once the XI is confirmed, captains click **"WhatsApp Brief"** in their dashboard. This copies a formatted match summary (Squad, Time, Venue) to the clipboard, ready to paste into the team's WhatsApp group.

---

## Admin Tasks

### Manual Availability Overrides

If a player messages you on WhatsApp instead of using the app:

1. Go to the **Squad Intel** tab.
2. Search for the player.
3. Click on their **Reliability** box.
4. It will cycle through: `Yes (Green)` → `No (Red)` → `Excused (Blue)` → `Clear`.
   - _Note: Use "Excused" for players on holiday or national duty so their reliability score isn't penalized._

### Managing the Roster

- **Adding/Editing Players:** Use the **Players** tab to search the roster.
- You can instantly **Activate/Deactivate** a player if they leave the club or get injured long-term.

### Fixtures

- Currently, 2026 fixtures are loaded via the `scripts/import-sheet-deep.ts` script.
- To add a one-off friendly, go to the **Fixtures** tab in the Admin Command Centre and fill out the form.

### Fixing Mistakes (Reopen XI)

If a captain confirms their XI but makes a mistake (e.g., a player drops out sick on Friday night):

1. The **Admin** goes to the Selection Hub.
2. Selects the team's match.
3. Clicks **Reopen XI**.
4. The match returns to "Selecting" state, and the captain can adjust their picks.
