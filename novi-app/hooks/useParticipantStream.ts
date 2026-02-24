'use client'

/**
 * useParticipantStream — DB-polling approach
 *
 * Used ONLY by non-host participants. Polls the /api/meeting/[id]/signal
 * endpoint for an SDP offer from the host, answers it, then continues polling
 * for ICE candidates. Returns the host's remote MediaStream once connected.
 *
 * No Realtime / WebSocket dependency — signals are stored in Supabase and
 * polled at regular intervals, so there are zero timing races.
 */

import { useEffect, useRef, useState } from 'react'

const STUN_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
]

const POLL_MS = 1500

interface UseParticipantStreamOptions {
  meetingId: string
  participantId: string
  hostId: string | null   // null if we don't know the host yet
  enabled: boolean
}

export function useParticipantStream({
  meetingId,
  participantId,
  hostId,
  enabled,
}: UseParticipantStreamOptions) {
  const [hostStream, setHostStream] = useState<MediaStream | null>(null)
  const pcRef = useRef<RTCPeerConnection | null>(null)
  const offeredRef = useRef(false)         // have we processed the offer?
  const sinceRef = useRef(new Date(0).toISOString())
  // Keep a ref to hostId so the ICE callback always has the latest value
  const hostIdRef = useRef<string | null>(hostId)
  useEffect(() => { hostIdRef.current = hostId }, [hostId])

  useEffect(() => {
    if (!enabled || !meetingId || !participantId) return

    let cancelled = false

    // Helper: POST a signal
    const postSignal = async (type: string, payload: unknown) => {
      try {
        await fetch(`/api/meeting/${meetingId}/signal`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fromId: participantId,
            toId: hostIdRef.current ?? 'host',
            type,
            payload,
          }),
        })
      } catch (err) {
        console.error('[useParticipantStream] postSignal error', err)
      }
    }

    // Create the peer connection
    const pc = new RTCPeerConnection({ iceServers: STUN_SERVERS })
    pcRef.current = pc

    // When host's tracks arrive, expose them
    pc.ontrack = (e) => {
      if (e.streams?.[0]) setHostStream(e.streams[0])
    }

    // Post our ICE candidates to the host via the signal table
    pc.onicecandidate = (e) => {
      if (e.candidate) {
        postSignal('ice', e.candidate.toJSON())
      }
    }

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'failed') {
        setHostStream(null)
        // Allow re-negotiation
        offeredRef.current = false
      }
    }

    // Poll the signal table
    const interval = setInterval(async () => {
      if (cancelled) return
      try {
        const res = await fetch(
          `/api/meeting/${meetingId}/signal?toId=${encodeURIComponent(participantId)}&since=${encodeURIComponent(sinceRef.current)}`
        )
        const data = await res.json() as {
          signals: Array<{ type: string; payload: unknown; from_id: string; created_at: string }>
        }
        const signals = data.signals ?? []

        if (signals.length > 0) {
          sinceRef.current = signals[signals.length - 1].created_at
        }

        for (const sig of signals) {
          // Only accept signals from the host (by their actual participant ID)
          if (hostIdRef.current && sig.from_id !== hostIdRef.current) continue

          if (sig.type === 'offer' && !offeredRef.current) {
            offeredRef.current = true
            try {
              await pc.setRemoteDescription(
                new RTCSessionDescription(sig.payload as RTCSessionDescriptionInit)
              )
              const answer = await pc.createAnswer()
              await pc.setLocalDescription(answer)
              await postSignal('answer', pc.localDescription)
            } catch (err) {
              console.error('[useParticipantStream] offer handling error', err)
              offeredRef.current = false
            }
          } else if (sig.type === 'ice') {
            try {
              await pc.addIceCandidate(new RTCIceCandidate(sig.payload as RTCIceCandidateInit))
            } catch {
              // stale candidate — ignore
            }
          }
        }
      } catch {
        // network error — will retry
      }
    }, POLL_MS)

    return () => {
      cancelled = true
      clearInterval(interval)
      pc.close()
      pcRef.current = null
      setHostStream(null)
      offeredRef.current = false
      sinceRef.current = new Date(0).toISOString()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meetingId, participantId, enabled])

  return { hostStream }
}