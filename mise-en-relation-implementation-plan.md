# Mise en relation — Implementation Plan

Working branch: `feature/mise-en-relation`

Combines two backlog items:
- "replace the term *reservation* with *mise en relation* throughout the UI"
- "change the reservation mechanism to a conversation/messaging flow with a few back-and-forth exchanges. The assistante then manually enters confirmed reservations in her planning"

Reference: `reservation rework plan.md` (user's high-level spec).

---

## Ground rules

- Ship in phases, each a clean commit. No single mega-PR.
- Keep DB/code identifiers (`reservations`, `ReservationsList.jsx`, `statut`) in English/existing style. Rename only **user-facing strings**.
- No real production data — schema changes can include destructive `UPDATE` of status values.
- Schema changes live as tracked files under `supabase/migrations/`. User runs them manually in the Supabase SQL editor.

## Status value naming (decided)

Keep French + snake_case lowercase to match existing `statut`, `jour`, `heure_debut` convention.

| Plan doc state | DB value | Notes |
|---|---|---|
| REQUESTED  | `demande`   | replaces `en_attente` |
| FINALIZED  | `finalisee` | assistante commits to planning |
| DENIED     | `refusee`   | assistante said no |
| CANCELLED  | `annulee`   | parent backed out |

Entry type: `demande` / `bloc_prive`.

> Revised after Phase 2: the intermediate `acceptee` (ACCEPTED) state
> was dropped. The thread itself signals engagement; a separate Accept
> button added no information. Phase 3 drops `acceptee` from the CHECK.

## State diagram

```
demande → finalisee   (assistante)
demande → refusee     (assistante)
demande → annulee     (parent)
```

Clear split: `refusee` = the assistante said no; `annulee` = the parent
backed out. Either can happen at any point while the request is in `demande`.

## Contact info reveal (parent side)

The assistante's phone/email is hidden on the parent's reservation card
until the request reaches `finalisee`. This preserves the existing
"engagement gate" intuition — just moved from the old `acceptee` state to
the new "sealed the deal" moment. The assistante can always share her
number inside the thread if she wants to, before finalization.

## Phases

### Phase 1 — Schema + value rename  *(in progress)*
Supabase migration file. Update JS code so app still compiles/works after running it.
- Remap existing rows: `en_attente → demande`, `confirmee → acceptee`.
- Replace CHECK constraint on `reservations.statut` with the new 5-value set.
- Add `reservations.entry_type text CHECK (entry_type IN ('demande','bloc_prive')) NOT NULL DEFAULT 'demande'`.
- Create `request_messages` (id, reservation_id, sender_id, body, created_at) + RLS.
- Rename code references to new values.

### Phase 2 — Messaging thread + realtime
- Shared `MessageThread` component used by both Parent and Assistante reservation lists.
- Posts to `request_messages`; subscribes via Supabase Realtime.
- Thread locks when `statut ∈ {finalisee, refusee, annulee}`.

### Phase 3 — State transitions, Finalize, calendar
- Assistante: **Finaliser** → `finalisee` (writes to planning); **Refuser** → `refusee`.
- Parent: **Annuler** → `annulee` (existing).
- No intermediate `acceptee` — thread replaces it.
- Calendar loads only `finalisee`; `demande` stays out of the planning.
- `bloc_prive` deferred to Phase 5 (no creation UI yet).
- Migration: drop `acceptee` from `reservations_statut_check`.
- Move parent-side contact-info reveal from `acceptee` → `finalisee`.
- Rip out the existing accept/deny single-message popup (redundant with thread).

### Phase 7 — Terminology sweep
- `réservation → mise en relation` / `demande` in JSX strings, toasts, validation, email templates.
- Keep code identifiers untouched.

## Deferred (not in this cycle)

- **Phase 4** — Assistante-initiated requests + magic-link invite (requires Edge Function; keep on backlog).
- **Phase 5** — Quick-add, private-block UI, families list, recurring slots.
- **Phase 6** — Email/SMS notifications beyond in-app realtime.
