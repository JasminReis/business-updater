# business-updater
app for small business that helps them with their internet appearance
📍 BusinessSync

Update your business everywhere in one place.

BusinessSync helps small businesses manage their online presence by updating Google Business Profile and their website from a single simple interface.

Instead of logging into multiple platforms, users just enter a change once — and it gets synced everywhere.

✨ Problem

Small business owners struggle to keep their online information up to date:

Google Business Profile is outdated
Website information doesn’t match reality
Hours, photos, and announcements are inconsistent
Updating multiple platforms takes too much time
💡 Solution

BusinessSync provides a single place to manage updates like:

Opening hours
Holiday closures
Photos
Business descriptions
Posts and announcements

One update → synced everywhere.

🚀 MVP Features
🔄 Google Business Sync
Connect Google Business Profile
Update basic business info
Push changes directly to Google
✍️ Simple Update Interface
Add “What changed?” input form
Examples:
“We are closed on Monday”
“New opening hours: 9–6”
“New lunch menu uploaded”
📸 Photo Updates
Upload images once
Automatically publish to Google listing
🧾 Basic Business Profile
Store business name, address, hours
Central source of truth
🧭 How It Works
Business connects Google account
Enters an update (text or structured form)
System processes and maps update to Google fields
Changes are published instantly
Business info stays consistent everywhere
🛠️ Tech Stack (Suggested MVP)
Frontend: React / Next.js
Backend: Node.js (Express or NestJS)
Database: PostgreSQL or Firebase
Auth: Google OAuth
API: Google Business Profile API
Hosting: Vercel / Render
🧪 First Steps (Very Important)
1. Validate Google API access

Before coding too much:

Apply for Google Business Profile API access
Confirm you can:
update hours
post updates
upload photos

👉 This is your biggest dependency

2. Build “Update Input” UI first

Start simple:

One text input:

“What changed?”

Button:

“Sync to Google”

No dashboard yet. No complexity.

3. Implement Google OAuth login
Allow users to connect their business account
Fetch their business locations
4. Hardcode first sync logic

Example mapping:

“We are closed tomorrow” → temporary closure
“New hours 9–6” → opening hours update
“New photo uploaded” → media upload

Keep it manual at first.

5. Build first end-to-end flow

Goal:

User writes update → Google listing actually changes

Even if it only supports 1–2 update types initially.

📈 Future Features
Website sync (Wix / custom pages)
Instagram/Facebook posting
Auto-suggestions (“Your hours seem outdated”)
AI parsing of updates into structured changes
Multi-location businesses
Agency dashboard
🎯 Vision

Make business updates as easy as sending a message:

“Tell us what changed — we’ll handle the rest.”
