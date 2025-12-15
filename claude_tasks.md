# Project Tasks & Improvements

## 🔄 Session Context (Last updated: 2025-12-13)

**Recent work:**
- Added app version update notification (UpdateNotification component + SW versioning)
- Added in-app real-time notifications for reservations (NotificationContext using Supabase Realtime)

**Key files for notifications:**
- `src/contexts/NotificationContext.jsx` - Real-time subscription to reservations table
- `src/components/UpdateNotification.jsx` - PWA version update banner
- `public/sw.js` - Service worker with SW_VERSION constant

**Pending notification phases:**
- Phase 2: Email notifications (blocked: need custom domain for Resend)
- Phase 3: Push notifications (can use Web Push API, no domain needed)

**Branch status:** All merged to main, ready to push

---

## 🐞 Bugs
- [x] in assistante/reservationList.jsx when getting the reservations from supabase, the child and slots fields always return NULL
- [x] in both assistante and parents reservation list the slots are not showing up - Fixed 2025-12-08 (converted integer jour to day name)
- [x] in the assistant schedule reserved/pending slots slots are not showing
- [x] in the reservation list, if the "duree" of a remplacement is less than a month or not a full month value, the duree is not correct (eg if the remplacement is for 15 days, duree = 0 months) - Fixed 2025-12-13 (added formatDuration utility that shows days/months properly)

## ✨ Features
- [x] when an assistant accepts or denies a reservation let them add a message. is it easy to add an in-app messaging system? is it worth it? an better idea to facilitate the reservation flow. probably not necessary beyond that as the parent and assistant will exchange numbers from there on
- [x] My latest changes are deployed but the app on my iPhone is not loading the changes and page in my browser is not upadted either. Force a refresh when a latest veriosn is available OR Add an "app version detector" so the UI tells users: "A new version is available — refresh" (with instructions) - Fixed 2025-12-13 (added SW version tracking, UpdateNotification component, and cache headers)- [ ] possibility to edit a reservation request (change dates and hours) on the parent side until the reservation is accepted or denied by the assistant. Then it can only be updated by the assistant (change dates and hours).
- [ ] in the assistant schedule, in the reservations popup, clicking on one of the reservations opens the reservation details (in popup?) with possibility to add/edit the end date. this is in cases when a parent ends/changes the contract
- [x] assistants see only pending reservations by default. with an option to see confirmed or denied demands - Fixed 2025-12-15 (added filter buttons with pending as default)
- [x] add notifications (email/txt/in app) when reservations are received/accepted/denied - In progress: Phase 1 (in-app) done 2025-12-13, email/push pending domain setup
- [ ] allow parents to search/view assistants without login in/registering. only require auth to make a reservation. at this point present the registration page in the reservation form (option to login if already registered). Home page is now a landing page (explains how the app works, highlight features, show reviews). use https://www.nounou-top.fr/annonces as example
- [ ] add a system of scoring (stars) and comments on assistants. Show the stars in the assistant card, with a way to see comments. assistants can see their score and comments too


## 🔧 Enhancements
- [x] Remove "/an" in the vacation weeks combo box (redundant text) - Fixed 2025-12-07
- [x] during reservation, after calculating earliest availability: auto-populate start date with that date, and disable days that are not available (inferred from availability data) - Fixed 2025-12-10- [ ] add an assistant option "gestion des contracts automatisee" that indicates the assistant is using an system like nounou-top.fr to manage the cotracts, paie and taxes to simplify the transaction. it's a plus. add  comment that explains that. check nounou-top.fr to formulate the correct message
- [x] during reservation, if a day is not available at the start date but available later, display "complet jusqu'au [date]". If start date is after that day's available date, the day should be selectable. Return full dayAvailability structure from calculateAvailability, compute earliestDate/availableDays/isFullyAvailable outside if only used in assistant card - Fixed 2025-12-10
- [x] move the "start date" and "Uniquement les disponibles" filters out of the "filtres avances" and make it a dynamic display option. Start date is today by default. in map view assistant that are not disponible for the start date are marked with a red marker - Fixed 2025-12-10
- [ ] availability granularity to the hour: if an assistant has a 4+ hour block available during the day, show that day as available in the reservation form but reduce the time range to the available range and add a comment (e.g., "from 12h to 16h only")
- [x] in the request list (both parent and assistant) make the parent note and assistant response look like a text message conversation (parent on the left, assistant on the right) - Fixed 2025-12-15


## 📘 Notes for Claude
- Always avoid scanning the entire repo.
- When I say "check tasks", look at this file only.
- When implementing a task, show which items you addressed.
