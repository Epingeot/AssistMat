-- Add care types (types d'accueil) feature
-- Allows assistantes to specify multiple types of care they offer

-- Add hourly rate column to assistantes_maternelles
ALTER TABLE assistantes_maternelles
ADD COLUMN IF NOT EXISTS tarif_horaire NUMERIC(10,2);

COMMENT ON COLUMN assistantes_maternelles.tarif_horaire IS 'Hourly rate in euros';

-- Create types_accueil table
CREATE TABLE IF NOT EXISTS types_accueil (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assistante_id UUID NOT NULL REFERENCES assistantes_maternelles(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('regulier', 'temps_partiel', 'periscolaire', 'occasionnel')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(assistante_id, type)
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_types_accueil_assistante_id ON types_accueil(assistante_id);
CREATE INDEX IF NOT EXISTS idx_types_accueil_type ON types_accueil(type);

-- Enable RLS
ALTER TABLE types_accueil ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Everyone can read care types
CREATE POLICY "Types accueil are viewable by everyone"
  ON types_accueil FOR SELECT
  USING (true);

-- Only the assistante can insert their own types
CREATE POLICY "Assistantes can insert own types"
  ON types_accueil FOR INSERT
  WITH CHECK (
    assistante_id IN (
      SELECT id FROM assistantes_maternelles WHERE user_id = auth.uid()
    )
  );

-- Only the assistante can delete their own types
CREATE POLICY "Assistantes can delete own types"
  ON types_accueil FOR DELETE
  USING (
    assistante_id IN (
      SELECT id FROM assistantes_maternelles WHERE user_id = auth.uid()
    )
  );

COMMENT ON TABLE types_accueil IS 'Types of care offered by each assistante maternelle';
COMMENT ON COLUMN types_accueil.type IS 'Type: regulier (full-time), temps_partiel (part-time), periscolaire (after-school), occasionnel (occasional)';

-- Update RPC function to include tarif_horaire
CREATE OR REPLACE FUNCTION rechercher_assistantes_par_distance(
  lat DOUBLE PRECISION,
  lon DOUBLE PRECISION,
  rayon_km DOUBLE PRECISION
)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  adresse TEXT,
  ville TEXT,
  code_postal TEXT,
  places_totales INTEGER,
  places_disponibles INTEGER,
  tarif_journalier NUMERIC,
  tarif_horaire NUMERIC,
  description TEXT,
  agrement TEXT,
  nom TEXT,
  prenom TEXT,
  distance_km DOUBLE PRECISION,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    am.id,
    am.user_id,
    am.adresse,
    am.ville,
    am.code_postal,
    am.places_totales,
    am.places_disponibles,
    am.tarif_journalier,
    am.tarif_horaire,
    am.description,
    am.agrement,
    p.nom,
    p.prenom,
    (ST_Distance(
      am.location::geography,
      ST_SetSRID(ST_MakePoint(lon, lat), 4326)::geography
    ) / 1000)::DOUBLE PRECISION AS distance_km,
    ST_Y(am.location::geometry)::DOUBLE PRECISION AS latitude,
    ST_X(am.location::geometry)::DOUBLE PRECISION AS longitude
  FROM assistantes_maternelles am
  INNER JOIN profiles p ON p.id = am.user_id
  WHERE ST_DWithin(
    am.location::geography,
    ST_SetSRID(ST_MakePoint(lon, lat), 4326)::geography,
    rayon_km * 1000
  )
  AND am.places_disponibles > 0
  ORDER BY distance_km;
END;
$$;
