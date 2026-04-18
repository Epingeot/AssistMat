# Project Tasks & Improvements

## 🔄 Session Context (Last updated: 2026-04-17)

**Recent work:**
- Applied brand color tokens across all UI components (chose Option 1: colored/branded uses only, gray/neutral deferred)
- Files updated: ScheduleEditor, ParentDashboard, ChildrenManager, SearchBar, AssistanteCard, both ReservationsLists, NotificationContext, AssistanteProfile, AvailabilityCalendar, ReservationModal, LandingPage
- Established semantic mapping: assistante=primary/azure, child=secondary/magenta, garden=accent/lime, pets=peach, pending/CDD=warning, confirmed=success, errors=error
- Native checkboxes switched from `text-*` to `accent-*` (only `accent-color` actually fills the checkbox)
- Gradients on submit buttons replaced with solid `bg-primary` per user pref
- Documented hex exceptions: react-hot-toast inline styles (App.jsx, NotificationContext.jsx) + Leaflet divIcon HTML (MapView.jsx)

**Branch status:** main, uncommitted changes across ~12 component files. `claude_tasks.md` and `"Resend API key.txt"` still untracked.

---

## 🐞 Bugs
- [x] in assistante/reservationList.jsx when getting the reservations from supabase, the child and slots fields always return NULL
- [x] in both assistante and parents reservation list the slots are not showing up - Fixed 2025-12-08 (converted integer jour to day name)
- [x] in the assistant schedule reserved/pending slots slots are not showing
- [x] in the reservation list, if the "duree" of a remplacement is less than a month or not a full month value, the duree is not correct (eg if the remplacement is for 15 days, duree = 0 months) - Fixed 2025-12-13 (added formatDuration utility that shows days/months properly)
- [ ] on the login page, when entering wrong credentials an error message shows at the top of the login window. Clicking "S'inscrire" to switch to signup mode does not clear the message — it should reset when toggling between login and signup.
- [ ] when adding a child in the parent profile with an empty first name, the browser shows an English validation message "Please fill out this field". All validation messages must be in French (likely caused by a native HTML `required` attribute — replace with custom French validation or set the input's `title`/use `setCustomValidity`).
- [ ] clicking "Rechercher" on the public search / parent dashboard fails with Postgres error `column am.location does not exist`. The error is raised inside the RPC function `rechercher_assistantes_par_distance`. Investigate: check if the `location` column (PostGIS point) still exists on `assistantes_maternelles`, or if the function uses a wrong table alias / out-of-date reference. Fix in Supabase SQL editor (Database → Functions).

## ✨ Features
- [x] when an assistant accepts or denies a reservation let them add a message. is it easy to add an in-app messaging system? is it worth it? an better idea to facilitate the reservation flow. probably not necessary beyond that as the parent and assistant will exchange numbers from there on
- [x] My latest changes are deployed but the app on my iPhone is not loading the changes and page in my browser is not upadted either. Force a refresh when a latest veriosn is available OR Add an "app version detector" so the UI tells users: "A new version is available — refresh" (with instructions) - Fixed 2025-12-13 (added SW version tracking, UpdateNotification component, and cache headers)- [ ] possibility to edit a reservation request (change dates and hours) on the parent side until the reservation is accepted or denied by the assistant. Then it can only be updated by the assistant (change dates and hours).
- [x] in the assistant schedule, in the reservations popup, clicking on one of the reservations opens the reservation details (in popup?) with possibility to add/edit the end date. this is in cases when a parent ends/changes the contract - Fixed 2025-12-15
- [x] assistants see only pending reservations by default. with an option to see confirmed or denied demands - Fixed 2025-12-15 (added filter buttons with pending as default)
- [x] add notifications (email/txt/in app) when reservations are received/accepted/denied - In progress: Phase 1 (in-app) done 2025-12-13, email/push pending domain setup
- [x] allow parents to search/view assistants without login in/registering. only require auth to make a reservation. at this point present the registration page in the reservation form (option to login if already registered). Home page is now a landing page (explains how the app works, highlight features, show reviews). use https://www.nounou-top.fr/annonces as example - Fixed 2025-12-16
- [ ] add a system of scoring (stars) and comments on assistants. Show the stars in the assistant card, with a way to see comments. assistants can see their score and comments too
- [ ] make a landing page for assistantes maternelles, with ability to switch between parent and assistante maternelle landing pages
- [ ] change the reservation mechanism to a conversation/messaging flow with a few back-and-forth exchanges. The assistante then manually enters confirmed reservations in her planning
- [ ] add extra optional information checkboxes for assistantes (complete list to follow)


## 🔧 Enhancements
- [x] Remove "/an" in the vacation weeks combo box (redundant text) - Fixed 2025-12-07
- [x] during reservation, after calculating earliest availability: auto-populate start date with that date, and disable days that are not available (inferred from availability data) - Fixed 2025-12-10- [ ] add an assistant option "gestion des contracts automatisee" that indicates the assistant is using an system like nounou-top.fr to manage the cotracts, paie and taxes to simplify the transaction. it's a plus. add  comment that explains that. check nounou-top.fr to formulate the correct message
- [x] during reservation, if a day is not available at the start date but available later, display "complet jusqu'au [date]". If start date is after that day's available date, the day should be selectable. Return full dayAvailability structure from calculateAvailability, compute earliestDate/availableDays/isFullyAvailable outside if only used in assistant card - Fixed 2025-12-10
- [x] move the "start date" and "Uniquement les disponibles" filters out of the "filtres avances" and make it a dynamic display option. Start date is today by default. in map view assistant that are not disponible for the start date are marked with a red marker - Fixed 2025-12-10
- [ ] availability granularity to the hour: if an assistant has a 4+ hour block available during the day, show that day as available in the reservation form but reduce the time range to the available range and add a comment (e.g., "from 12h to 16h only")
- [x] in the request list (both parent and assistant) make the parent note and assistant response look like a text message conversation (parent on the left, assistant on the right) - Fixed 2025-12-15
- [ ] add a home link to the Register/login pages to go back to the landing page
- [x] customize Supabase auth emails with AssistMat branding in French + configure Resend SMTP to send from `noreply@assistmat.com` - Fixed 2026-04-13 (Confirm signup, Reset password, Change email done; Magic Link/Invite/Reauth left default)
- [ ] improve post-signup UX: after "Inscription réussie ! Vérifiez votre email." the S'inscrire button stays enabled. Disable it after success, and/or redirect to the login page after a few seconds (with a visible countdown/message)
- [x] Apply brand color tokens from tailwind.config.js across all existing components, replacing any hardcoded hex values or generic Tailwind colors (e.g. blue-500) with semantic tokens (primary, secondary, accent, surface, text-base, success, warning, error, info). - Fixed 2026-04-17 (colored/branded uses only; gray/neutral deferred per follow-up task)
- [ ] Follow-up to brand color pass: decide how to handle generic gray/neutral Tailwind classes (`bg-gray-*`, `text-gray-*`, `border-gray-*`, `slate/zinc/neutral/stone-*`). Options: leave as-is, map to existing `surface`/`text-base`/`text-muted` tokens, or add a neutral scale token to `tailwind.config.js`. ~400 occurrences across components — requires visual review before bulk replace.
- [ ] replace the term "reservation" with "mise en relation" throughout the UI (labels, buttons, messages, emails)
- [ ] rename "Semaines de vacances" to "Semaines d'absence" on the assistante profile/availability, and raise the max value to 20
- [ ] make the optional criteria non-filtering in search: instead of excluding assistantes that don't match, use them to sort results by number of matching criteria (descending)

## 📘 Notes for Claude
- Always avoid scanning the entire repo.
- When I say "check tasks", look at this file only.
- When implementing a task, show which items you addressed.
