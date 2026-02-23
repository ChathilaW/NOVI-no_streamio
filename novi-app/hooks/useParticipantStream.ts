'use client'

/**
 * useParticipantStream
 *
 * Used ONLY by non-host participants in a group meeting.
 * Connects to the Supabase Realtime signaling channel, requests a stream from
 * the host, and negotiates a WebRTC peer connection to receive the host's webcam.
 *
 * Returns `hostStream` — the MediaStream from the host (or null while connecting).
 */

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@supabase/supabase-js'

const STUN_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
]

interface UseParticipantStreamOptions {
  meetingId: string
  participantId: string
  /** Set to false while the user is not yet a participant (e.g. setup screen) */
  enabled: boolean
}

export function useParticipantStream({
  meetingId,
  participantId,
  enabled,
}: UseParticipantStreamOptions) {
  const [hostStream, setHostStream] = useState<MediaStream | null>(null)
  const pcRef = useRef<RTCPeerConnection | null>(null)
  const channelRef = useRef<ReturnType<ReturnType<typeof createClient>['channel']> | null>(null)

  useEffect(() => {
    if (!enabled || !meetingId || !participantId) return

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    const channelName = `webrtc-${meetingId}`
    const channel = supabase.channel(channelName, {
      config: { broadcast: { self: false } },
    })
    channelRef.current = channel

    const pc = new RTCPeerConnection({ iceServers: STUN_SERVERS })
    pcRef.current = pc

    // When we receive a track from the host, expose it as hostStream
    pc.ontrack = (event) => {
      if (event.streams && event.streams[0]) {
        setHostStream(event.streams[0])
      }
    }

    // Forward our ICE candidates to the host via broadcast
    pc.onicecandidate = (e) => {
      if (e.candidate) {
        channel.send({
          type: 'broadcast',
          event: 'ice-candidate',
          payload: {
            from: participantId,
            to: 'host',
            candidate: e.candidate.toJSON(),
          },
        })
      }
    }

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'failed') {
        // Connection failed — reset hostStream so the UI can show a reconnecting state
        setHostStream(null)
      }
    }

    channel
      // Receive SDP offer from the host
      .on('broadcast', { event: 'sdp-offer' }, async ({ payload }) => {
        const { to, sdp } = payload as { to: string; sdp: RTCSessionDescriptionInit }
        // Only process offers meant for us
        if (to !== participantId) return
        if (pc.remoteDescription) return // already negotiated

        try {
          await pc.setRemoteDescription(new RTCSessionDescription(sdp))
          const answer = await pc.createAnswer()
          await pc.setLocalDescription(answer)

          channel.send({
            type: 'broadcast',
            event: 'sdp-answer',
            payload: {
              from: participantId,
              sdp: pc.localDescription,
            },
          })
        } catch (err) {
          console.error('[useParticipantStream] answer error', err)
        }
      })
      // Receive ICE candidates from the host (addressed to us)
      .on('broadcast', { event: 'ice-candidate' }, async ({ payload }) => {
        const { from, to, candidate } = payload as {
          from: string
          to: string
          candidate: RTCIceCandidateInit
        }
        // Only process candidates from the host addressed to us
        if (from !== 'host' || to !== participantId) return
        try {
          await pc.addIceCandidate(new RTCIceCandidate(candidate))
        } catch (err) {
          console.error('[useParticipantStream] addIceCandidate error', err)
        }
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          // Announce ourselves to the host so it starts the offer flow
          channel.send({
            type: 'broadcast',
            event: 'request-stream',
            payload: { from: participantId },
          })
        }
      })

    return () => {
      pc.close()
      pcRef.current = null
      supabase.removeChannel(channel)
      setHostStream(null)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meetingId, participantId, enabled])

  return { hostStream }
}