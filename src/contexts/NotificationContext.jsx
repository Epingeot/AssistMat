import { createContext, useContext, useEffect, useState, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './AuthContext'
import { logger } from '../utils/logger'
import toast from 'react-hot-toast'

/**
 * NotificationContext
 *
 * Provides real-time notifications for reservation events using Supabase Realtime.
 *
 * How it works:
 * 1. When user logs in, we subscribe to the 'reservations' table
 * 2. We filter events based on user role:
 *    - Assistantes: notified when new reservation is created for them
 *    - Parents: notified when their reservation status changes
 * 3. Toast notifications are shown for relevant events
 *
 * Supabase Realtime uses WebSockets to push changes instantly.
 */

const NotificationContext = createContext({})

export const useNotifications = () => {
  const context = useContext(NotificationContext)
  if (!context) {
    throw new Error('useNotifications must be used within NotificationProvider')
  }
  return context
}

export const NotificationProvider = ({ children }) => {
  const { user, profile } = useAuth()
  const [unreadCount, setUnreadCount] = useState(0)
  const subscriptionRef = useRef(null)

  // Track the assistante_id for filtering (needed for assistantes)
  const [assistanteId, setAssistanteId] = useState(null)

  // Load assistante_id if user is an assistante
  useEffect(() => {
    const loadAssistanteId = async () => {
      if (!user || profile?.role !== 'assistante') {
        setAssistanteId(null)
        return
      }

      try {
        const { data, error } = await supabase
          .from('assistantes_maternelles')
          .select('id')
          .eq('user_id', user.id)
          .maybeSingle()

        if (error) {
          logger.error('❌ Failed to load assistante_id:', error)
          return
        }

        if (data) {
          setAssistanteId(data.id)
          logger.log('🔔 NotificationContext: Loaded assistante_id:', data.id)
        }
      } catch (err) {
        logger.error('❌ Error loading assistante_id:', err)
      }
    }

    loadAssistanteId()
  }, [user, profile?.role])

  // Set up real-time subscription
  useEffect(() => {
    // Clean up any existing subscription
    if (subscriptionRef.current) {
      logger.log('🔔 Cleaning up previous subscription')
      supabase.removeChannel(subscriptionRef.current)
      subscriptionRef.current = null
    }

    // Don't subscribe if not logged in or profile not loaded
    if (!user || !profile) {
      logger.log('🔔 No user/profile, skipping subscription')
      return
    }

    // For assistantes, wait until we have their assistante_id
    if (profile.role === 'assistante' && !assistanteId) {
      logger.log('🔔 Waiting for assistante_id before subscribing')
      return
    }

    logger.log('🔔 Setting up real-time subscription for:', profile.role)

    // Create the subscription channel
    const channel = supabase
      .channel('reservation-notifications')
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'reservations'
        },
        (payload) => handleReservationChange(payload)
      )
      .subscribe((status) => {
        logger.log('🔔 Subscription status:', status)
      })

    subscriptionRef.current = channel

    // Cleanup on unmount or when dependencies change
    return () => {
      if (subscriptionRef.current) {
        logger.log('🔔 Removing subscription channel')
        supabase.removeChannel(subscriptionRef.current)
        subscriptionRef.current = null
      }
    }
  }, [user, profile, assistanteId])

  /**
   * Handle reservation changes from real-time subscription
   */
  const handleReservationChange = (payload) => {
    logger.log('🔔 Reservation change received:', payload)

    const { eventType, new: newRecord, old: oldRecord } = payload

    // Determine if this notification is relevant to the current user
    if (profile.role === 'assistante') {
      handleAssistanteNotification(eventType, newRecord, oldRecord)
    } else if (profile.role === 'parent') {
      handleParentNotification(eventType, newRecord, oldRecord)
    }
  }

  /**
   * Handle notifications for assistantes
   * - New reservation request (INSERT with their assistante_id)
   * - Reservation cancelled by parent (UPDATE statut to 'annulee')
   */
  const handleAssistanteNotification = (eventType, newRecord, oldRecord) => {
    // Check if this reservation is for this assistante
    if (newRecord?.assistante_id !== assistanteId && oldRecord?.assistante_id !== assistanteId) {
      return // Not for us
    }

    if (eventType === 'INSERT' && newRecord.statut === 'en_attente') {
      // New reservation request
      logger.log('🔔 New reservation request for assistante')
      setUnreadCount(prev => prev + 1)

      toast.success(
        'Nouvelle demande de réservation !',
        {
          duration: 6000,
          icon: '📩',
        }
      )
    } else if (eventType === 'UPDATE') {
      // Check if parent cancelled
      if (oldRecord?.statut !== 'annulee' && newRecord?.statut === 'annulee') {
        logger.log('🔔 Reservation cancelled by parent')
        toast(
          'Une réservation a été annulée par le parent',
          {
            duration: 5000,
            icon: '❌',
          }
        )
      }
    }
  }

  /**
   * Handle notifications for parents
   * - Reservation accepted (UPDATE statut to 'confirmee')
   * - Reservation rejected (UPDATE statut to 'annulee' by assistante)
   */
  const handleParentNotification = (eventType, newRecord, oldRecord) => {
    // Check if this reservation belongs to this parent
    if (newRecord?.parent_id !== user.id && oldRecord?.parent_id !== user.id) {
      return // Not for us
    }

    if (eventType === 'UPDATE' && oldRecord?.statut === 'en_attente') {
      // Status changed from pending
      if (newRecord?.statut === 'confirmee') {
        logger.log('🔔 Reservation accepted')
        setUnreadCount(prev => prev + 1)

        toast.success(
          'Votre réservation a été acceptée !',
          {
            duration: 6000,
            icon: '✅',
          }
        )
      } else if (newRecord?.statut === 'annulee') {
        logger.log('🔔 Reservation rejected')
        setUnreadCount(prev => prev + 1)

        toast(
          'Votre réservation a été refusée',
          {
            duration: 6000,
            icon: '😔',
            style: {
              background: '#fef2f2',
              color: '#991b1b',
            },
          }
        )
      }
    }
  }

  /**
   * Clear the unread count (e.g., when user views notifications)
   */
  const clearUnreadCount = () => {
    setUnreadCount(0)
  }

  return (
    <NotificationContext.Provider value={{
      unreadCount,
      clearUnreadCount
    }}>
      {children}
    </NotificationContext.Provider>
  )
}
