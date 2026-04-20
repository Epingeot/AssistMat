import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import { logger } from '../../utils/logger'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import toast from 'react-hot-toast'

/**
 * MessageThread
 *
 * Chat thread on a single reservation (a "mise en relation").
 * Shared by Parent and Assistante reservation lists.
 *
 * Behavior:
 * - Fetches existing messages from the `request_messages` table.
 * - Subscribes to Supabase Realtime INSERTs for this reservation so new
 *   messages from the other party appear without a refresh.
 * - When `isLocked` is true (terminal status), composer is hidden.
 *
 * Props:
 * - reservationId:      uuid of the reservation
 * - currentUserId:      auth.uid() of the viewer
 * - userLabels:         { [userId]: string } — display name map for bubbles
 * - isLocked:           disable composer when true
 * - lockedReason:       caption shown when locked
 */
export default function MessageThread({
  reservationId,
  currentUserId,
  userLabels = {},
  isLocked = false,
  lockedReason = 'Ce fil est fermé.'
}) {
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(true)
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const channelRef = useRef(null)

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      setLoading(true)
      const { data, error } = await supabase
        .from('request_messages')
        .select('id, reservation_id, sender_id, body, created_at')
        .eq('reservation_id', reservationId)
        .order('created_at', { ascending: true })

      if (cancelled) return
      if (error) {
        logger.error('Error loading messages:', error)
      } else {
        setMessages(data || [])
      }
      setLoading(false)
    }
    load()

    const channel = supabase
      .channel(`request-messages-${reservationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'request_messages',
          filter: `reservation_id=eq.${reservationId}`
        },
        (payload) => {
          setMessages((prev) => {
            if (prev.some((m) => m.id === payload.new.id)) return prev
            return [...prev, payload.new]
          })
        }
      )
      .subscribe()

    channelRef.current = channel

    return () => {
      cancelled = true
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
    }
  }, [reservationId])

  const handleSend = async (e) => {
    e.preventDefault()
    const body = draft.trim()
    if (!body || sending) return
    setSending(true)
    try {
      const { error } = await supabase
        .from('request_messages')
        .insert({
          reservation_id: reservationId,
          sender_id: currentUserId,
          body
        })
      if (error) throw error
      setDraft('')
    } catch (err) {
      logger.error('Error sending message:', err)
      toast.error("Erreur lors de l'envoi du message")
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="space-y-3">
      {loading && messages.length === 0 ? (
        <p className="text-sm text-muted italic">Chargement des messages...</p>
      ) : messages.length > 0 ? (
        <div className="space-y-2">
          {messages.map((msg) => {
            const isMine = msg.sender_id === currentUserId
            const label = isMine
              ? 'Vous'
              : userLabels[msg.sender_id] || 'Autre'
            return (
              <div
                key={msg.id}
                className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] p-3 rounded-2xl ${
                    isMine
                      ? 'bg-primary text-white rounded-br-md'
                      : 'bg-chip text-ink rounded-bl-md'
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap">{msg.body}</p>
                  <p
                    className={`text-xs mt-1 ${
                      isMine ? 'text-white/70 text-right' : 'text-muted'
                    }`}
                  >
                    {label} ·{' '}
                    {format(new Date(msg.created_at), 'dd/MM à HH:mm', {
                      locale: fr
                    })}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      ) : null}

      {isLocked ? (
        <p className="text-xs text-muted italic text-center">{lockedReason}</p>
      ) : (
        <form onSubmit={handleSend} className="flex gap-2 items-end">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Écrire un message..."
            rows={2}
            maxLength={1000}
            className="flex-1 px-3 py-2 border border-line rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none text-sm"
          />
          <button
            type="submit"
            disabled={!draft.trim() || sending}
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition disabled:opacity-50 text-sm font-semibold"
          >
            {sending ? 'Envoi...' : 'Envoyer'}
          </button>
        </form>
      )}
    </div>
  )
}
