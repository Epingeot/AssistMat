# Project Tasks & Improvements

## 🐞 Bugs
- [x] in assistante/reservationList.jsx when getting the reservations from supabase, the child and slots fields always return NULL
- [x] in both assistante and parents reservation list the slots are not showing up - Fixed 2025-12-08 (converted integer jour to day name)
- [x] in the assistant schedule reserved/pending slots slots are not showing
- [ ] in the reservation list, if the "duree" of a remplacement is less than a month or not a full mont hvalue, the duree is not correct (eg ig the remplacement is for 15 days, duree = 0 months)

## ✨ Features
- [x] when an assistant accepts or denies a reservation let them add a message. is it easy to add an in-app messaging system? is it worth it? an better idea to facilitate the reservation flow. probably not necessary beyond that as the parent and assistant will exchange numbers from there on
- [x] My latest changes are deployed but the app on my iPhone is not loading the changes and page in my browser is not upadted either. Force a refresh when a latest veriosn is available OR Add an "app version detector" so the UI tells users: "A new version is available — refresh" (with instructions) - Fixed 2025-12-13 (added SW version tracking, UpdateNotification component, and cache headers)- [ ] possibility to edit a reservation request (change dates and hours) on the parent side until the reservation is accepted or denied by the assistant. Then it can only be updated by the assistant (change dates and hours).
- [ ] in the assistant schedule, in the reservations popup, clicking on one of the reservations opens the reservation details (in popup?) with possibility to add/edit the end date. this is in cases when a parent ends/changes the contract- [ ] assistants see only pending reservations by default. with an option to see confirmed or denied demands. propose different options
- [x] add notifications (email/txt/in app) when reservations are received/accepted/denied - In progress: Phase 1 (in-app) done 2025-12-13, email/push pending domain setup
- [ ] allow parents to search/view assistants without login in/registering. only require auth to make a reservation. at this point present the registration page in the reservation form (option to login if already registered). Home page is now a landing page (explains how the app works, highlight features, show reviews). use https://www.nounou-top.fr/annonces as example
- [ ] add a system of scoring (stars) and comments on assistants. Show the stars in the assistant card, with a way to see comments. assistants can see their score and comments too


## 🔧 Enhancements
- [x] Remove "/an" in the vacation weeks combo box (redundant text) - Fixed 2025-12-07
- [x] during reservation, after calculating earliest availability: auto-populate start date with that date, and disable days that are not available (inferred from availability data) - Fixed 2025-12-10- [ ] add an assistant option "gestion des contracts automatisee" that indicates the assistant is using an system like nounou-top.fr to manage the cotracts, paie and taxes to simplify the transaction. it's a plus. add  comment that explains that. check nounou-top.fr to formulate the correct message
- [x] during reservation, if a day is not available at the start date but available later, display "complet jusqu'au [date]". If start date is after that day's available date, the day should be selectable. Return full dayAvailability structure from calculateAvailability, compute earliestDate/availableDays/isFullyAvailable outside if only used in assistant card - Fixed 2025-12-10
- [x] move the "start date" and "Uniquement les disponibles" filters out of the "filtres avances" and make it a dynamic display option. Start date is today by default. in map view assistant that are not disponible for the start date are marked with a red marker - Fixed 2025-12-10
- [ ] availability granularity to the hour: if an assistant has a 4+ hour block available during the day, show that day as available in the reservation form but reduce the time range to the available range and add a comment (e.g., "from 12h to 16h only")


## 📘 Notes for Claude
- Always avoid scanning the entire repo.
- When I say "check tasks", look at this file only.
- When implementing a task, show which items you addressed.
