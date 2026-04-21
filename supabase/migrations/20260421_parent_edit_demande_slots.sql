-- =============================================================================
-- Allow the parent to edit their own demande while it is still in 'demande'
-- status. Without a DELETE policy on reservation_slots, the client-side "delete
-- old slots, insert new ones" pattern silently deletes 0 rows and the inserts
-- stack on top of the originals.
--
-- This migration adds:
--   1. A DELETE policy on reservation_slots limited to the parent who owns
--      the reservation AND only while the reservation is still a demande.
--   2. (Defensive) A matching INSERT policy so the replace step succeeds even
--      on setups where the parent never had INSERT — leave the existing
--      policies in place; these are additive (PERMISSIVE) and OR together.
-- =============================================================================

DROP POLICY IF EXISTS reservation_slots_parent_delete_own_demande ON reservation_slots;
CREATE POLICY reservation_slots_parent_delete_own_demande
  ON reservation_slots
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM reservations r
      WHERE r.id = reservation_slots.reservation_id
        AND r.parent_id = auth.uid()
        AND r.statut = 'demande'
    )
  );

DROP POLICY IF EXISTS reservation_slots_parent_insert_own_demande ON reservation_slots;
CREATE POLICY reservation_slots_parent_insert_own_demande
  ON reservation_slots
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM reservations r
      WHERE r.id = reservation_slots.reservation_id
        AND r.parent_id = auth.uid()
        AND r.statut = 'demande'
    )
  );
