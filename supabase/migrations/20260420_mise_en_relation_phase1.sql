-- =====================================================================
-- Phase 1 — Mise en relation: status values + entry_type + request_messages
-- =====================================================================
-- Run this in the Supabase SQL editor (Database → SQL Editor).
-- Reference: mise-en-relation-implementation-plan.md
--
-- What it does:
--   1. Drops the old CHECK on reservations.statut so we can remap values.
--   2. Remaps existing rows: en_attente → demande, confirmee → acceptee.
--   3. Re-adds CHECK with the new 5-value set.
--   4. Adds reservations.entry_type ('demande' | 'bloc_prive').
--   5. Creates request_messages table (per-reservation chat thread).
--   6. Enables RLS so only the two parties on a reservation can use it.
--   7. Adds request_messages to the realtime publication for Phase 2.
-- =====================================================================

-- 1) Drop the existing CHECK on statut --------------------------------
-- If the constraint name differs from the Postgres default, find it with:
--   SELECT conname FROM pg_constraint
--    WHERE conrelid = 'reservations'::regclass AND contype = 'c';
ALTER TABLE reservations DROP CONSTRAINT IF EXISTS reservations_statut_check;

-- 2) Remap existing statut values -------------------------------------
UPDATE reservations SET statut = 'demande'  WHERE statut = 'en_attente';
UPDATE reservations SET statut = 'acceptee' WHERE statut = 'confirmee';

-- 3) Re-add CHECK with the new set ------------------------------------
ALTER TABLE reservations
  ADD CONSTRAINT reservations_statut_check
  CHECK (statut IN ('demande', 'acceptee', 'finalisee', 'refusee', 'annulee'));

-- 4) Update column default --------------------------------------------
ALTER TABLE reservations ALTER COLUMN statut SET DEFAULT 'demande';

-- 5) Add entry_type column --------------------------------------------
-- 'demande'    = linked to a parent request (current behavior)
-- 'bloc_prive' = assistante-only block, no parent linked (Phase 5)
ALTER TABLE reservations
  ADD COLUMN IF NOT EXISTS entry_type text
  NOT NULL DEFAULT 'demande';

ALTER TABLE reservations DROP CONSTRAINT IF EXISTS reservations_entry_type_check;
ALTER TABLE reservations
  ADD CONSTRAINT reservations_entry_type_check
  CHECK (entry_type IN ('demande', 'bloc_prive'));

-- 6) Create request_messages table ------------------------------------
-- One row per message posted on a reservation's conversation thread.
CREATE TABLE IF NOT EXISTS request_messages (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id uuid NOT NULL REFERENCES reservations(id) ON DELETE CASCADE,
  sender_id      uuid NOT NULL REFERENCES auth.users(id)    ON DELETE CASCADE,
  body           text NOT NULL CHECK (length(btrim(body)) > 0),
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS request_messages_reservation_idx
  ON request_messages(reservation_id, created_at);

-- 7) Row Level Security (RLS) -----------------------------------------
-- RLS = Supabase/Postgres restricts which rows a user can read/write
-- based on auth.uid() (the logged-in user's id).
-- Rule: a user can see/post messages on a reservation only if they are
-- either the parent on that reservation or the owner (user_id) of the
-- assistante attached to it. Thread is read-only (no INSERT) once the
-- reservation reaches a terminal status.
ALTER TABLE request_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS request_messages_select ON request_messages;
DROP POLICY IF EXISTS request_messages_insert ON request_messages;

CREATE POLICY request_messages_select ON request_messages
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM reservations r
    LEFT JOIN assistantes_maternelles am ON am.id = r.assistante_id
    WHERE r.id = request_messages.reservation_id
      AND (r.parent_id = auth.uid() OR am.user_id = auth.uid())
  )
);

CREATE POLICY request_messages_insert ON request_messages
FOR INSERT WITH CHECK (
  sender_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM reservations r
    LEFT JOIN assistantes_maternelles am ON am.id = r.assistante_id
    WHERE r.id = request_messages.reservation_id
      AND (r.parent_id = auth.uid() OR am.user_id = auth.uid())
      AND r.statut IN ('demande', 'acceptee')
  )
);

-- 8) Realtime publication ---------------------------------------------
-- Lets the frontend subscribe to INSERTs on this table (Phase 2).
-- If it errors with "already member", that's fine — ignore.
ALTER PUBLICATION supabase_realtime ADD TABLE request_messages;
