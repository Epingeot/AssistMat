-- =============================================================================
-- Let the assistante opt in to sharing her full contact info (adresse,
-- téléphone, email) with the parent while the demande is still pending.
--
-- Without this flag, the parent only sees the city on a demande; full address
-- and contact details are revealed once statut = 'finalisee'. With this flag,
-- the assistante can choose to reveal them earlier — typically to coordinate
-- a visit or phone call before finalizing.
--
-- Adds:
--   - reservations.contact_shared boolean NOT NULL DEFAULT false
--
-- No new RLS is needed:
--   - Parents already SELECT their own reservations (column comes along).
--   - Assistantes already UPDATE reservations they own (same path used by
--     the Finaliser/Refuser actions).
-- =============================================================================

ALTER TABLE reservations
  ADD COLUMN IF NOT EXISTS contact_shared boolean NOT NULL DEFAULT false;
