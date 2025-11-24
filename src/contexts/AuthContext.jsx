import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

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
    // Initialiser l'authentification
    const initAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        
        console.log('🔄 Init: Session retrieved:', session?.user?.email)
        
        if (session?.user) {
          setUser(session.user)
          await loadProfile(session.user.id)
        } else {
          setLoading(false)
        }
      } catch (error) {
        console.error('❌ Init error:', error)
        setLoading(false)
      }
    }

    // Écouter les changements d'auth
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('🔔 Auth changed:', event, session?.user?.email)
        
        setUser(session?.user ?? null)
        
        if (session?.user) {
          await loadProfile(session.user.id)
        } else {
          setProfile(null)
          setLoading(false)
        }
      }
    )

    initAuth()

    return () => {
      console.log('🧹 Cleaning up subscription')
      subscription.unsubscribe()
    }
  }, [])

  const loadProfile = async (userId) => {
    try {
      console.log('📥 Loading profile for:', userId)
      
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (error) throw error
      
      console.log('✅ Profile loaded:', data.role)
      setProfile(data)
    } catch (error) {
      console.error('❌ Profile error:', error)
    } finally {
      setLoading(false)
    }
  }

  const signUp = async (email, password, role, nom, prenom) => {
    console.log('📝 Signing up:', email, role)
    
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
    console.log('🔑 Signing in user', email)
    console.log('👤 AuthContext: signIn called')
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    
    console.log('👤 AuthContext: signIn response:', { 
      user: data?.user?.email, 
      error 
    })
    
    if (error) throw error
    
    // Forcer la mise à jour immédiate (au cas où onAuthStateChange est lent)
    if (data.user) {
      console.log('🔄 Forcing user update immediately')
      setUser(data.user)
      await loadProfile(data.user.id)
    }
    
    return data
  }

  const signOut = async () => {
    console.log('👋 Signing out')
    
    const { error } = await supabase.auth.signOut()
    if (error) throw error
    
    setUser(null)
    setProfile(null)
  }

  console.log('🎨 AuthProvider render:', { 
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