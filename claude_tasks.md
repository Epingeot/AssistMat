# Project Tasks & Improvements

## 🐞 Bugs
- [x] in assistante/reservationList.jsx when getting the reservations from supabase, the child and slots fields always return NULL
- [x] in both assistante and parents reservation list the slots are not showing up - Fixed 2025-12-08 (converted integer jour to day name)
- [x] in the assistant schedule reserved/pending slots slots are not showing
- [ ] in the reservation list, if the "duree" of a remplacement is less than a month or not a full mont hvalue, the duree is not correct (eg ig the remplacement is for 15 days, duree = 0 months)

## ✨ Features
- [x] when an assistant accepts or denies a reservation let them add a message. is it easy to add an in-app messaging system? is it worth it? an better idea to facilitate the reservation flow. probably not necessary beyond that as the parent and assistant will exchange numbers from there on
- [ ] possibility to edit a reservation request (change dates and hours) on the parent side until the reservation is accepted or denied by the assistant. Then it can only be updated by the assistant (change dates and hours).
- [ ] assistants see only pending reservations by default. with an option to see confirmed or denied demands. propose different options
- [ ] in the assistant schedule, in the reservations popup, clicking on one of the reservations opens the reservation details (in popup?) with possibility to add/edit the end date. this is in cases when a parent ends/changes the contract
- [ ] add notifications (email/txt/in app) when reservations are received/accepted/denied
- [ ] allow parents to search/view assistants without login in/registering. only require auth to make a reservation. at this point present the registration page in the reservation form (option to login if already registered). Home page is now a landing page (explains how the app works, highlight features, show reviews). use https://www.nounou-top.fr/annonces as example
- [ ] add a system of scoring (stars) and comments on assistants. Show the stars in the assistant card, with a way to see comments. assistants can see their score and comments too

## 🔧 Enhancements
- [x] Remove "/an" in the vacation weeks combo box (redundant text) - Fixed 2025-12-07
- [ ] add an assistant option "gestion des contracts automatisee" that indicates the assistant is using an system like nounou-top.fr to manage the cotracts, paie and taxes to simplify the transaction. it's a plus. add  comment that explains that. check nounou-top.fr to formulate the correct message

## 📘 Notes for Claude
- Always avoid scanning the entire repo.
- When I say "check tasks", look at this file only.
- When implementing a task, show which items you addressed.
