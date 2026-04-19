export const translateAuthError = (err) => {
  if (!err) return 'Une erreur est survenue. Veuillez réessayer.'

  switch (err.code) {
    case 'invalid_credentials':
      return 'Email ou mot de passe incorrect.'
    case 'email_not_confirmed':
      return 'Email non confirmé. Vérifiez votre boîte de réception.'
    case 'user_already_exists':
    case 'email_exists':
      return 'Un compte existe déjà avec cet email.'
    case 'weak_password':
      return "Le mot de passe ne respecte pas les exigences de sécurité."
    case 'same_password':
      return "Le nouveau mot de passe doit être différent de l'ancien."
    case 'email_address_invalid':
    case 'validation_failed':
      return 'Adresse email invalide.'
    case 'over_email_send_rate_limit':
    case 'over_request_rate_limit':
      return 'Trop de tentatives. Veuillez réessayer dans quelques minutes.'
    case 'signup_disabled':
      return "Les inscriptions sont désactivées pour le moment."
  }

  // Non-AuthError fallbacks (network failures, etc. have no code)
  const msg = (err.message || '').toLowerCase()
  if (msg.includes('network') || msg.includes('failed to fetch')) {
    return 'Erreur réseau. Vérifiez votre connexion.'
  }

  return 'Une erreur est survenue. Veuillez réessayer.'
}
