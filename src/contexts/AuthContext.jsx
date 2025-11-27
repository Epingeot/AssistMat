import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { logger } from '../utils/logger'

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
      
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle()  // ← Changé de .single() à .maybeSingle()

      logger.log('📦 Profile query result:', { data, error })

      if (error) {
        logger.error('❌ Profile error:', error)
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

  return (
    <AuthContext.Provider value={{ user, profile, loading, signUp, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}