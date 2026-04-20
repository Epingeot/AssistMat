-- =====================================================================
-- Phase 3 — Mise en relation: drop the `acceptee` state
-- =====================================================================
-- Reference: mise-en-relation-implementation-plan.md
--
-- Decision after Phase 2: the intermediate `acceptee` state adds no info
-- once messaging exists. The thread signals engagement; finalization is
-- the single commit-to-planning moment. States become:
--   demande → finalisee   (assistante)
--   demande → refusee     (assistante)
--   demande → annulee     (parent)
--
-- No real data → safe to drop `acceptee` without a remap (test DB only).
-- If any row currently sits in `acceptee`, move it back to `demande` so
-- the new CHECK accepts it.
-- =====================================================================

UPDATE reservations SET statut = 'demande' WHERE statut = 'acceptee';

ALTER TABLE reservations DROP CONSTRAINT IF EXISTS reservations_statut_check;

ALTER TABLE reservations
  ADD CONSTRAINT reservations_statut_check
  CHECK (statut IN ('demande', 'finalisee', 'refusee', 'annulee'));
