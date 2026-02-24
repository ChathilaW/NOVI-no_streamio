'use client'

/**
 * useHostStream — DB-polling approach
 *
 * Used ONLY by the host. For each non-host participant, creates one
 * RTCPeerConnection, adds local video tracks, posts an SDP offer to the
 * /api/meeting/[id]/signal endpoint, then polls for the SDP answer and ICE
 * candidates and applies them.
 *
 * Uses the same Supabase-backed REST API as the rest of the app.
 * No Realtime / WebSocket dependency — zero timing races.
 */

import { useEffect, useRef } from 'react'
import { Participant } from './useParticipants'

const STUN_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
]

const POLL_MS = 1500

interface UseHostStreamOptions {
  meetingId: string
  localStream: MediaStream | null
  enabled: boolean
  participants: Participant[]
  hostId: string
}

export function useHostStream({
  meetingId,
  localStream,
  enabled,
  participants,
  hostId,
}: UseHostStreamOptions) {
  // Map: participantId → RTCPeerConnection
  const peersRef = useRef<Map<string, RTCPeerConnection>>(new Map())
  // Track the latest `since` timestamp per participant to avoid re-processing old signals
  const sinceRef = useRef<Map<string, string>>(new Map())
  const localStreamRef = useRef<MediaStream | null>(null)

  // Always keep localStreamRef up to date
  useEffect(() => {
    localStreamRef.current = localStream
  }, [localStream])

  // Helper: POST a signal
  const postSignal = async (
    fromId: string,
    toId: string,
    type: string,
    payload: unknown
  ) => {
    try {
      await fetch(`/api/meeting/${meetingId}/signal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fromId, toId, type, payload }),
      })
    } catch (err) {
      console.error('[useHostStream] postSignal error', err)
    }
  }

  // Helper: GET new signals addressed to the host from a specific participant
  const fetchSignals = async (fromParticipantId: string) => {
    const key = `from-${fromParticipantId}`
    const since = sinceRef.current.get(key) ?? new Date(0).toISOString()
    try {
      const res = await fetch(
        `/api/meeting/${meetingId}/signal?toId=${encodeURIComponent(hostId)}&since=${encodeURIComponent(since)}`
      )
      const data = await res.json() as { signals: Array<{ type: string; payload: unknown; from_id: string; created_at: string }> }
      const relevant = (data.signals ?? []).filter((s) => s.from_id === fromParticipantId)
      if (relevant.length > 0) {
        // Advance the cursor past the latest signal we've seen
        sinceRef.current.set(
          key,
          relevant[relevant.length - 1].created_at
        )
      }
      return relevant
    } catch {
      return []
    }
  }

  // Helper: create and offer a peer connection to a participant
  const connectPeer = async (participantId: string) => {
    const stream = localStreamRef.current
    if (!stream) return

    const pc = new RTCPeerConnection({ iceServers: STUN_SERVERS })
    peersRef.current.set(participantId, pc)

    // Add all local tracks
    stream.getTracks().forEach((track) => pc.addTrack(track, stream))

    // When we generate ICE candidates, post them to the signal table
    pc.onicecandidate = (e) => {
      if (e.candidate) {
        postSignal(hostId, participantId, 'ice', e.candidate.toJSON())
      }
    }

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'failed' || pc.connectionState === 'closed') {
        peersRef.current.delete(participantId)
      }
    }

    try {
      const offer = await pc.createOffer()
      await pc.setLocalDescription(offer)
      await postSignal(hostId, participantId, 'offer', pc.localDescription)
    } catch (err) {
      console.error('[useHostStream] createOffer error', err)
    }

    return pc
  }

  // React to participant list changes
  useEffect(() => {
    if (!enabled || !meetingId || !hostId) return

    const nonHosts = participants.filter((p) => !p.isHost && p.id !== hostId)
    const currentIds = new Set(nonHosts.map((p) => p.id))

    // Close peers for participants who left
    peersRef.current.forEach((pc, id) => {
      if (!currentIds.has(id)) {
        pc.close()
        peersRef.current.delete(id)
        sinceRef.current.delete(`from-${id}`)
      }
    })

    // Connect to new participants
    nonHosts.forEach((p) => {
      if (!peersRef.current.has(p.id)) {
        connectPeer(p.id)
      }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [participants, enabled, meetingId, hostId])

  // Poll for answers and ICE candidates from each participant
  useEffect(() => {
    if (!enabled || !meetingId || !hostId) return

    const interval = setInterval(async () => {
      for (const [participantId, pc] of peersRef.current.entries()) {
        const signals = await fetchSignals(participantId)

        for (const sig of signals) {
          if (sig.type === 'answer' && !pc.remoteDescription) {
            try {
              await pc.setRemoteDescription(
                new RTCSessionDescription(sig.payload as RTCSessionDescriptionInit)
              )
            } catch (err) {
              console.error('[useHostStream] setRemoteDescription error', err)
            }
          } else if (sig.type === 'ice') {
            try {
              await pc.addIceCandidate(new RTCIceCandidate(sig.payload as RTCIceCandidateInit))
            } catch {
              // stale candidate — ignore
            }
          }
        }
      }
    }, POLL_MS)

    return () => clearInterval(interval)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, meetingId, hostId])

  // Replace tracks on all existing peer connections when localStream changes
  useEffect(() => {
    if (!localStream) return
    peersRef.current.forEach((pc) => {
      pc.getSenders().forEach((sender) => {
        if (sender.track?.kind === 'video') {
          const vt = localStream.getVideoTracks()[0]
          if (vt) sender.replaceTrack(vt)
        }
        if (sender.track?.kind === 'audio') {
          const at = localStream.getAudioTracks()[0]
          if (at) sender.replaceTrack(at)
        }
      })
    })
  }, [localStream])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      peersRef.current.forEach((pc) => pc.close())
      peersRef.current.clear()
      sinceRef.current.clear()
    }
  }, [])
}
