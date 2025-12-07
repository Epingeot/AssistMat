# AssistMat Scheduling System Rework Plan

**Created:** 2025-12-06
**Status:** Steps 1-5 Complete, Step 6 In Progress

---

## Backlog / Ideas

Add items here as you think of them. Use `[x]` to mark completed items.

### Bugs to Fix
- [ ]

### Improvements
- [x] Remove "/an" in the vacation weeks combo box (redundant text) - Fixed 2025-12-07

### New Features / Ideas
- [ ]

### Technical Debt
- [ ] Drop old tables (jours_ouvrables, types_accueil) after verifying migration
- [ ] Drop deprecated columns from assistantes_maternelles (tarif_journalier, tarif_horaire, places_totales, places_disponibles)

---

## Summary

Transform the scheduling system from simple day-based booking to a time-slot-based calendar with conflict detection, vacation tracking, and child information management.

---

## New Business Rules

### For Assistantes Maternelles (CDI/yearly basis only):

| Field | Description |
|-------|-------------|
| vacation_weeks | Number of vacation weeks/year (usually 5) |
| working_days | 7-day selection (includes weekends) |
| working_hours | Per-day hours (e.g., 8:00-18:00), each day can differ |
| max_kids | Maximum children at any time (1-4) |
| max_days_per_week_per_kid | Limit days per child per week |
| accepts_periscolaire | Optional checkbox (before/after school, wednesdays, school vacations) |
| accepts_remplacements | Optional checkbox (short contracts for other assistantes) |

**Removed:** tarifs (not advertised), service types except periscolaire

### For Reservations:

- Time-slot based with **30-minute granularity**
- Parents select specific days AND hours (e.g., Monday 9:00-15:00)
- Minimum duration: 3 months
- Calculate average hours/month: `(hours_per_week * (52 - vacation_weeks)) / 12`
- Track by child (child info in parent profile)
- Conflict detection prevents overlapping bookings

### Calendar View:

| Slot Type | Color |
|-----------|-------|
| Available (working hours) | Light green/blue |
| Booked/Confirmed | Solid blue |
| Pending reservation | Gray (striped) |
| Non-working hours/days | Light gray |

- Show child's first name on booked slots (with RGPD consent)
- Both assistantes and parents see the same calendar

### Parent Profile Addition:

- Child's first name (required for booking)
- RGPD consent checkbox for displaying child name on calendars

---

## PHASE 1: Database Schema Changes

### 1.1 Modify `assistantes_maternelles` Table

```sql
-- Add new columns
ALTER TABLE assistantes_maternelles
ADD COLUMN max_kids INTEGER DEFAULT 4 CHECK (max_kids >= 1 AND max_kids <= 4),
ADD COLUMN max_days_per_week_per_kid INTEGER DEFAULT 5,
ADD COLUMN vacation_weeks INTEGER DEFAULT 5,
ADD COLUMN accepts_periscolaire BOOLEAN DEFAULT false,
ADD COLUMN accepts_remplacements BOOLEAN DEFAULT false;

-- After migration, drop old columns:
-- DROP COLUMN tarif_journalier, tarif_horaire, places_totales, places_disponibles
```

### 1.2 Create `horaires_travail` Table (replaces `jours_ouvrables`)

```sql
CREATE TABLE horaires_travail (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  assistante_id UUID NOT NULL REFERENCES assistantes_maternelles(id) ON DELETE CASCADE,
  jour INTEGER NOT NULL CHECK (jour >= 0 AND jour <= 6), -- 0=lundi, 6=dimanche
  heure_debut TIME NOT NULL,
  heure_fin TIME NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(assistante_id, jour),
  CHECK (heure_fin > heure_debut)
);

CREATE INDEX idx_horaires_assistante ON horaires_travail(assistante_id);
```

### 1.3 Create `children` Table

```sql
CREATE TABLE children (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  parent_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  prenom VARCHAR(100) NOT NULL,
  date_naissance DATE,
  rgpd_consent_display_name BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_children_parent ON children(parent_id);
```

### 1.4 Create `reservation_slots` Table

```sql
CREATE TABLE reservation_slots (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  reservation_id UUID NOT NULL REFERENCES reservations(id) ON DELETE CASCADE,
  jour INTEGER NOT NULL CHECK (jour >= 0 AND jour <= 6),
  heure_debut TIME NOT NULL,
  heure_fin TIME NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CHECK (heure_fin > heure_debut)
);

CREATE INDEX idx_slots_reservation ON reservation_slots(reservation_id);
```

### 1.5 Modify `reservations` Table

```sql
ALTER TABLE reservations
ADD COLUMN child_id UUID REFERENCES children(id),
ADD COLUMN notes TEXT;

-- jours_semaine column will be deprecated (data moved to reservation_slots)
```

### 1.6 Create `booked_slots` Table (for conflict detection)

```sql
CREATE TABLE booked_slots (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  assistante_id UUID NOT NULL REFERENCES assistantes_maternelles(id) ON DELETE CASCADE,
  reservation_id UUID NOT NULL REFERENCES reservations(id) ON DELETE CASCADE,
  child_id UUID REFERENCES children(id),
  date DATE NOT NULL,
  heure_debut TIME NOT NULL,
  heure_fin TIME NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_booked_assistante_date ON booked_slots(assistante_id, date);
CREATE INDEX idx_booked_reservation ON booked_slots(reservation_id);
```

### 1.7 Conflict Detection Function

```sql
CREATE OR REPLACE FUNCTION check_slot_conflict(
  p_assistante_id UUID,
  p_date DATE,
  p_heure_debut TIME,
  p_heure_fin TIME,
  p_exclude_reservation_id UUID DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
  conflict_count INTEGER;
  max_kids INTEGER;
BEGIN
  SELECT am.max_kids INTO max_kids
  FROM assistantes_maternelles am
  WHERE am.id = p_assistante_id;

  SELECT COUNT(DISTINCT child_id) INTO conflict_count
  FROM booked_slots bs
  WHERE bs.assistante_id = p_assistante_id
    AND bs.date = p_date
    AND bs.heure_debut < p_heure_fin
    AND bs.heure_fin > p_heure_debut
    AND (p_exclude_reservation_id IS NULL OR bs.reservation_id != p_exclude_reservation_id);

  RETURN conflict_count >= max_kids;
END;
$$ LANGUAGE plpgsql;
```

### 1.8 Drop Old Tables (after migration)

```sql
DROP TABLE IF EXISTS types_accueil;
DROP TABLE IF EXISTS jours_ouvrables;
```

---

## PHASE 2: Utility Functions

### Create `src/utils/scheduling.js`

```javascript
// Day mapping (0=lundi for French context)
export const JOURS = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'];

// Generate 30-minute time slots
export function generateTimeSlots(startTime, endTime) {
  const slots = [];
  let [startHour, startMin] = startTime.split(':').map(Number);
  const [endHour, endMin] = endTime.split(':').map(Number);

  while (startHour < endHour || (startHour === endHour && startMin < endMin)) {
    const slotStart = `${String(startHour).padStart(2, '0')}:${String(startMin).padStart(2, '0')}`;
    startMin += 30;
    if (startMin >= 60) {
      startMin = 0;
      startHour++;
    }
    const slotEnd = `${String(startHour).padStart(2, '0')}:${String(startMin).padStart(2, '0')}`;
    slots.push({ start: slotStart, end: slotEnd });
  }
  return slots;
}

// Check if two time ranges overlap
export function timeRangesOverlap(range1, range2) {
  return range1.start < range2.end && range1.end > range2.start;
}

// Calculate average hours per month
export function calculateAvgHoursPerMonth(hoursPerWeek, vacationWeeks = 5) {
  return (hoursPerWeek * (52 - vacationWeeks)) / 12;
}

// Convert time string to minutes
export function timeToMinutes(timeStr) {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
}

// Format time for display
export function formatTime(timeStr) {
  return timeStr.replace(':', 'h');
}
```

---

## PHASE 3: Assistante Side Components

### 3.1 Create `src/components/Assistante/ScheduleEditor.jsx`

Replaces JoursSemaine.jsx with 7-day time picker:

```
ScheduleEditor
├── DayRow (x7, including weekends)
│   ├── Checkbox (enable/disable day)
│   ├── TimePicker (start time, 30-min increments)
│   └── TimePicker (end time, 30-min increments)
└── Summary
    ├── Total hours/week
    └── Average hours/month (with vacation adjustment)
```

### 3.2 Modify `src/components/Assistante/AssistanteProfile.jsx`

**Remove:**
- Tarif inputs (tarif_journalier, tarif_horaire)
- Places inputs (places_totales, places_disponibles)
- Types d'accueil checkboxes (4 options)

**Add:**
- max_kids selector (1-4)
- max_days_per_week_per_kid selector
- vacation_weeks input (default 5)
- accepts_periscolaire checkbox
- accepts_remplacements checkbox
- Replace JoursSemaine with ScheduleEditor

### 3.3 Modify `src/components/Assistante/ReservationsList.jsx`

- Show child name for each reservation
- Show time slots instead of day names
- Show calculated hours per week/month

---

## PHASE 4: Parent Side Components

### 4.1 Create `src/components/Parent/ChildrenManager.jsx`

```
ChildrenManager
├── ChildList
│   └── ChildCard (for each child)
│       ├── Name
│       ├── RGPD consent toggle
│       └── Edit/Delete buttons
└── AddChildForm
    ├── prenom input
    ├── date_naissance input (optional)
    └── rgpd_consent checkbox
```

### 4.2 Rework `src/components/Parent/ReservationModal.jsx`

**Current:** Date range + day checkboxes
**New:** Time-slot selection with calendar

```
ReservationModal
├── Header (assistante info, max_kids, vacation_weeks)
├── ChildSelector (dropdown + "Add new child" option)
├── DateRangeSelector (start/end, min 3 months)
├── TimeSlotSelector (weekly view)
│   └── AvailabilityCalendar (shows working hours, booked slots)
│       └── Clickable 30-min slots
├── Summary
│   ├── Selected slots per week
│   ├── Hours per week
│   └── Average hours/month (vacation-adjusted)
└── Actions (Cancel, Submit)
```

### 4.3 Modify `src/components/Parent/AssistanteCard.jsx`

**Remove:** Tarif display, types d'accueil badges

**Add:**
- max_kids display
- Working hours summary (e.g., "Lun-Ven 8h-18h")
- accepts_periscolaire / accepts_remplacements badges
- vacation_weeks info

### 4.4 Modify `src/components/Parent/SearchBar.jsx`

**Remove:** Types d'accueil filter (4 checkboxes)

**Add (optional):**
- Filter by accepts_periscolaire
- Filter by accepts_remplacements

### 4.5 Modify `src/pages/ParentDashboard.jsx`

Add new tab or section: "Mes enfants" with ChildrenManager

### 4.6 Modify `src/components/Parent/ReservationsList.jsx`

- Show child name for each reservation
- Show time slots instead of day names
- Show calculated hours

---

## PHASE 5: Shared Calendar Component

### Create `src/components/Calendar/AvailabilityCalendar.jsx`

Shared between assistantes and parents:

```javascript
// Props
{
  assistanteId: UUID,
  mode: 'view' | 'select',  // 'view' for assistante, 'select' for parent
  selectedSlots: [],         // for select mode
  onSlotSelect: (slot) => void,
  weekStartDate: Date,
  onWeekChange: (date) => void
}
```

**Features:**
- Weekly view with 30-minute rows
- 7 day columns
- Color coding (see table above)
- Shows child names if RGPD consent given
- Week navigation (prev/next)
- Responsive for mobile

---

## PHASE 6: Data Migration

### Migration Script

```sql
-- 1. Migrate jours_ouvrables to horaires_travail (with default 8:00-18:00)
INSERT INTO horaires_travail (assistante_id, jour, heure_debut, heure_fin)
SELECT
  assistante_id,
  CASE jour
    WHEN 'lundi' THEN 0
    WHEN 'mardi' THEN 1
    WHEN 'mercredi' THEN 2
    WHEN 'jeudi' THEN 3
    WHEN 'vendredi' THEN 4
    WHEN 'samedi' THEN 5
    WHEN 'dimanche' THEN 6
  END,
  '08:00'::TIME,
  '18:00'::TIME
FROM jours_ouvrables;

-- 2. Migrate places_totales to max_kids
UPDATE assistantes_maternelles SET max_kids = LEAST(places_totales, 4);

-- 3. Migrate periscolaire flag
UPDATE assistantes_maternelles am
SET accepts_periscolaire = EXISTS (
  SELECT 1 FROM types_accueil ta
  WHERE ta.assistante_id = am.id AND ta.type = 'periscolaire'
);

-- 4. Migrate existing reservations (requires creating placeholder children)
-- This step needs manual review
```

---

## Implementation Order

### Step 1: Database Setup ✅ COMPLETE
- [x] Create new tables in Supabase (children, horaires_travail, reservation_slots, booked_slots)
- [x] Add new columns to assistantes_maternelles
- [x] Create conflict detection function
- [x] Create `src/utils/scheduling.js`

### Step 2: Assistante Profile Rework ✅ COMPLETE
- [x] Create ScheduleEditor.jsx component
- [x] Modify AssistanteProfile.jsx (remove old fields, add new ones)
- [x] Update save logic for horaires_travail

### Step 3: Calendar Component ✅ COMPLETE
- [x] Create AvailabilityCalendar.jsx base component
- [x] Add to AssistanteDashboard for viewing bookings

### Step 4: Parent Child Management ✅ COMPLETE
- [x] Create ChildrenManager.jsx
- [x] Add to ParentDashboard
- [x] Implement RGPD consent flow

### Step 5: Reservation Rework ✅ COMPLETE
- [x] Rework ReservationModal.jsx with time slots
- [x] Implement conflict detection UI
- [x] Add hours/month calculation display

### Step 6: Polish & Migration ⏳ IN PROGRESS
- [x] Update AssistanteCard.jsx display (removed tarifs, added schedule info)
- [x] Update SearchBar.jsx filters (replaced old types with periscolaire/remplacements)
- [x] Update both ReservationsList components (added time slots, child names)
- [ ] Run data migration (user needs to run if they have existing data)
- [ ] Drop old tables/columns (after verifying migration)

---

## Key Files Reference

| File | Changes |
|------|---------|
| `src/components/Assistante/AssistanteProfile.jsx` | Major rework |
| `src/components/Assistante/JoursSemaine.jsx` | Replace with ScheduleEditor |
| `src/components/Assistante/ReservationsList.jsx` | Update display |
| `src/components/Parent/ReservationModal.jsx` | Major rework |
| `src/components/Parent/AssistanteCard.jsx` | Remove tarifs, update display |
| `src/components/Parent/SearchBar.jsx` | Update filters |
| `src/components/Parent/ReservationsList.jsx` | Update display |
| `src/pages/ParentDashboard.jsx` | Add child management |
| `src/pages/AssistanteDashboard.jsx` | Add calendar view |

### New Files to Create

| File | Purpose |
|------|---------|
| `src/utils/scheduling.js` | Time slot utilities |
| `src/components/Assistante/ScheduleEditor.jsx` | 7-day time picker |
| `src/components/Parent/ChildrenManager.jsx` | Child CRUD + RGPD |
| `src/components/Calendar/AvailabilityCalendar.jsx` | Shared calendar view |

---

## RGPD Notes

- Child first name shown on calendar only if `rgpd_consent_display_name = true`
- Otherwise show "Réservé" or "Occupé"
- Parents can toggle consent at any time via ChildrenManager
- Add consent explanation text in UI

---

## Sources (RGPD Research)

- [Obligations RGPD - Service-Public.fr](https://entreprendre.service-public.gouv.fr/vosdroits/F24270)
- [Référentiel CNIL Protection de l'enfance](https://www.cnil.fr/sites/default/files/atoms/files/referentiel_protection_enfance.pdf)
