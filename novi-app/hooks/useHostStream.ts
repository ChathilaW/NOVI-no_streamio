'use client'

/**
 * useHostStream
 *
 * Used ONLY by the host in a group meeting.
 * For every participant that appears in the Supabase Realtime presence channel,
 * this hook creates a WebRTC RTCPeerConnection, adds the host's local video track,
 * and exchanges SDP + ICE candidates via Supabase Realtime broadcast.
 *
 * The hook is entirely client-side — no server changes required.
 */

import { useEffect, useRef } from 'react'
import { createClient } from '@supabase/supabase-js'

const STUN_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
]

interface UseHostStreamOptions {
  meetingId: string
  /** The host's local MediaStream (already acquired by Grp-MeetingRoom) */
  localStream: MediaStream | null
  /** Whether the host is actually in host role */
  enabled: boolean
}

export function useHostStream({ meetingId, localStream, enabled }: UseHostStreamOptions) {
  // Map of participantId → RTCPeerConnection
  const peersRef = useRef<Map<string, RTCPeerConnection>>(new Map())
  const channelRef = useRef<ReturnType<ReturnType<typeof createClient>['channel']> | null>(null)
  const localStreamRef = useRef<MediaStream | null>(null)

  // Keep localStreamRef in sync so the effect below always has the latest stream
  useEffect(() => {
    localStreamRef.current = localStream
  }, [localStream])

  useEffect(() => {
    if (!enabled || !meetingId) return

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    const channelName = `webrtc-${meetingId}`
    const channel = supabase.channel(channelName, {
      config: { broadcast: { self: false } },
    })
    channelRef.current = channel

    /** Create (or return existing) peer connection for a given participant */
    const getOrCreatePeer = (participantId: string): RTCPeerConnection => {
      const existing = peersRef.current.get(participantId)
      if (existing) return existing

      const pc = new RTCPeerConnection({ iceServers: STUN_SERVERS })
      peersRef.current.set(participantId, pc)

      // Add current video/audio tracks to this new peer connection
      const stream = localStreamRef.current
      if (stream) {
        stream.getTracks().forEach((track) => pc.addTrack(track, stream))
      }

      // When we get ICE candidates, broadcast them tagged for this participant
      pc.onicecandidate = (e) => {
        if (e.candidate) {
          channel.send({
            type: 'broadcast',
            event: 'ice-candidate',
            payload: {
              from: 'host',
              to: participantId,
              candidate: e.candidate.toJSON(),
            },
          })
        }
      }

      pc.onconnectionstatechange = () => {
        if (pc.connectionState === 'failed' || pc.connectionState === 'closed') {
          peersRef.current.delete(participantId)
        }
      }

      return pc
    }

    /** Initiate an offer to a specific participant */
    const offerTo = async (participantId: string) => {
      const pc = getOrCreatePeer(participantId)

      // Guard: if already have a remote description, skip
      if (pc.remoteDescription) return

      try {
        const offer = await pc.createOffer()
        await pc.setLocalDescription(offer)

        channel.send({
          type: 'broadcast',
          event: 'sdp-offer',
          payload: {
            from: 'host',
            to: participantId,
            sdp: pc.localDescription,
          },
        })
      } catch (err) {
        console.error('[useHostStream] offer error', err)
      }
    }

    channel
      // A participant requests a stream — host sends them an offer
      .on('broadcast', { event: 'request-stream' }, async ({ payload }) => {
        const { from: participantId } = payload as { from: string }
        await offerTo(participantId)
      })
      // Handle SDP answers from participants
      .on('broadcast', { event: 'sdp-answer' }, async ({ payload }) => {
        const { from: participantId, sdp } = payload as { from: string; sdp: RTCSessionDescriptionInit }
        const pc = peersRef.current.get(participantId)
        if (!pc || pc.remoteDescription) return
        try {
          await pc.setRemoteDescription(new RTCSessionDescription(sdp))
        } catch (err) {
          console.error('[useHostStream] setRemoteDescription error', err)
        }
      })
      // Handle ICE candidates from participants
      .on('broadcast', { event: 'ice-candidate' }, async ({ payload }) => {
        const { from: participantId, to, candidate } = payload as {
          from: string
          to: string
          candidate: RTCIceCandidateInit
        }
        // Only process candidates addressed to the host
        if (to !== 'host') return
        const pc = peersRef.current.get(participantId)
        if (!pc) return
        try {
          await pc.addIceCandidate(new RTCIceCandidate(candidate))
        } catch (err) {
          console.error('[useHostStream] addIceCandidate error', err)
        }
      })
      .subscribe()

    return () => {
      // Clean up all peer connections on unmount
      peersRef.current.forEach((pc) => pc.close())
      peersRef.current.clear()
      supabase.removeChannel(channel)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meetingId, enabled])
}
