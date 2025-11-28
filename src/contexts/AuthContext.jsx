import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { logger } from '../utils/logger'
import ErrorBoundary from '../components/ErrorBoundary'

const AuthContext = createContext({})

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let subscription = null
    let isMounted = true

    // Initialiser l'authentification
    const initAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        
        logger.log('🔄 Init: Session retrieved:', session?.user?.email)
        
        if (!isMounted) return

        if (session?.user) {
          setUser(session.user)
          await loadProfile(session.user.id)
        } else {
          setLoading(false)
        }
      } catch (error) {
        logger.error('❌ Init error:', error)
        if (isMounted) setLoading(false)
      }
    }

    // Écouter les changements d'auth
    const setupListener = () => {
      const { data } = supabase.auth.onAuthStateChange(
        async (event, session) => {
          logger.log('🔔 Auth changed:', event, session?.user?.email)

          if (!isMounted) return

          // Handle session expiration/refresh failures
          if (event === 'TOKEN_REFRESHED') {
            logger.log('🔄 Token refreshed successfully')
          }

          if (event === 'SIGNED_OUT' || event === 'USER_DELETED') {
            logger.log('👋 User signed out or deleted')
            setUser(null)
            setProfile(null)
            setLoading(false)
            return
          }

          setUser(session?.user ?? null)

          if (session?.user) {
            await loadProfile(session.user.id)
          } else {
            setProfile(null)
            setLoading(false)
          }
        }
      )

      subscription = data.subscription
    }

    initAuth()
    setupListener()

    return () => {
      logger.log('🧹 Cleaning up subscription')
      isMounted = false
      if (subscription) {
        subscription.unsubscribe()
      }
    }
  }, [])

  const loadProfile = async (userId) => {
    try {
      logger.log('📥 Loading profile for:', userId)

      // Add timeout to prevent hanging on expired sessions
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Profile load timeout')), 10000)
      )

      const queryPromise = supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle()

      const { data, error } = await Promise.race([queryPromise, timeoutPromise])

      logger.log('📦 Profile query result:', { data, error })

      if (error) {
        logger.error('❌ Profile error:', error)
        // If auth error, sign out the user
        if (error.message?.includes('JWT') || error.code === 'PGRST301') {
          logger.warn('⚠️ Session expired, signing out')
          await supabase.auth.signOut()
          return
        }
        throw error
      }

      if (data) {
        logger.log('✅ Profile loaded:', data.role)
        setProfile(data)
      } else {
        logger.warn('⚠️ No profile found')
        setProfile(null)
      }
    } catch (error) {
      logger.error('❌ Profile loading failed:', error)

      // If timeout or session error, sign out
      if (error.message === 'Profile load timeout') {
        logger.warn('⏱️ Profile load timed out, likely session expired')
        await supabase.auth.signOut()
      }

      setProfile(null)
    } finally {
      logger.log('🏁 Setting loading to false')
      setLoading(false)
    }
  }

  const signUp = async (email, password, role, nom, prenom) => {
    logger.log('📝 Signing up:', email, role)
    
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { role, nom, prenom }
      }
    })
    
    if (error) throw error

    // Attendre que le trigger crée le profil
    await new Promise(resolve => setTimeout(resolve, 500))

    // Vérifier et créer le profil si nécessaire
    if (data.user) {
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', data.user.id)
        .maybeSingle()

      if (!existingProfile) {
        await supabase
          .from('profiles')
          .insert([{ id: data.user.id, email, role, nom, prenom }])
      }
    }

    return data
  }

  const signIn = async (email, password) => {
    logger.log('🔑 Signing in user', email)
    logger.log('👤 AuthContext: signIn called')
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    
    logger.log('👤 AuthContext: signIn response:', { 
      user: data?.user?.email, 
      error 
    })
    
    if (error) throw error
    
    // Forcer la mise à jour immédiate (au cas où onAuthStateChange est lent)
    if (data.user) {
      logger.log('🔄 Forcing user update immediately')
      setUser(data.user)
      await loadProfile(data.user.id)
    }
    
    return data
  }

  const signOut = async () => {
    logger.log('👋 Signing out')
    
    const { error } = await supabase.auth.signOut()
    if (error) throw error
    
    setUser(null)
    setProfile(null)
  }

  logger.log('🎨 AuthProvider render:', {
    user: user?.email,
    role: profile?.role,
    loading
  })

  // 🧪 TEST: Uncomment to simulate auth error
  // throw new Error('TEST: Simulated authentication error')

  return (
    <ErrorBoundary
      name="Auth Provider"
      fallback={({ error }) => (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
          <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full">
            <div className="text-center mb-6">
              <div className="text-red-500 text-6xl mb-4">🔒</div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Erreur d'authentification
              </h2>
              <p className="text-gray-600">
                Impossible de charger votre session. Votre profil est peut-être corrompu ou votre session a expiré.
              </p>
            </div>

            {import.meta.env.DEV && (
              <details className="mb-6 text-xs">
                <summary className="cursor-pointer text-gray-600 hover:text-gray-900">
                  Détails de l'erreur
                </summary>
                <pre className="mt-2 p-3 bg-gray-100 rounded overflow-auto text-red-600 max-h-32">
                  {error?.toString()}
                </pre>
              </details>
            )}

            <button
              onClick={async () => {
                await supabase.auth.signOut()
                window.location.href = '/login'
              }}
              className="w-full bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600 transition font-medium"
            >
              Se déconnecter et réessayer
            </button>
          </div>
        </div>
      )}
    >
      <AuthContext.Provider value={{ user, profile, loading, signUp, signIn, signOut }}>
        {children}
      </AuthContext.Provider>
    </ErrorBoundary>
  )
}