// Must match Supabase server policy (Dashboard → Authentication → Providers → Email → Password Requirements).
// Update both together or users will see mismatched rules vs. actual signup rejections.
export const PASSWORD_MIN_LENGTH = 8

export const passwordRules = [
  { label: `Au moins ${PASSWORD_MIN_LENGTH} caractères`, test: (p) => p.length >= PASSWORD_MIN_LENGTH },
  { label: 'Une lettre minuscule', test: (p) => /[a-z]/.test(p) },
  { label: 'Une lettre majuscule', test: (p) => /[A-Z]/.test(p) },
  { label: 'Un chiffre', test: (p) => /[0-9]/.test(p) },
]
