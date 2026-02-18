'use client'

import { useEffect, useRef } from 'react'

interface UseDistractionDetectionOptions {
  videoRef: React.RefObject<HTMLVideoElement | null>
  meetingId: string
  participantId: string
  isCameraOn: boolean
}

/**
 * useDistractionDetection
 *
 * Runs combined.js distraction detection on the local webcam feed and
 * POSTs the participant's status to /api/meeting/[id]/distraction every ~1s.
 *
 * The ML model runs entirely in the browser — no video is sent to the server,
 * only the resulting status string.
 */
const useDistractionDetection = ({
  videoRef,
  meetingId,
  participantId,
  isCameraOn,
}: UseDistractionDetectionOptions) => {
  const rafRef = useRef<number | null>(null)
  const lastPostRef = useRef<number>(0)
  const initializedRef = useRef(false)
  const detectRef = useRef<((video: HTMLVideoElement, w: number, h: number, ts: number) => { status: string } | null) | null>(null)

  // Dynamically import combined.js (avoids SSR issues with MediaPipe)
  useEffect(() => {
    if (!meetingId || !participantId) return

    let cancelled = false

    const init = async () => {
      try {
        const mod = await import('@/ml-calculations/combined')
        if (cancelled) return
        await mod.initDistraction()
        detectRef.current = mod.detectDistraction
        initializedRef.current = true
      } catch (err) {
        console.error('[DistractionDetection] init failed:', err)
      }
    }

    init()

    return () => {
      cancelled = true
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      // Best-effort cleanup
      fetch(`/api/meeting/${meetingId}/distraction?participantId=${participantId}`, {
        method: 'DELETE',
        keepalive: true,
      }).catch(() => {})
    }
  }, [meetingId, participantId])

  // Detection loop
  useEffect(() => {
    if (!isCameraOn) return

    const loop = (timestamp: number) => {
      const video = videoRef.current
      if (
        initializedRef.current &&
        detectRef.current &&
        video &&
        video.readyState >= 2 &&
        video.videoWidth > 0
      ) {
        const result = detectRef.current(video, video.videoWidth, video.videoHeight, timestamp)

        // Throttle POST to once per second
        if (result && timestamp - lastPostRef.current > 200) {
          lastPostRef.current = timestamp
          const status = result.status as 'FOCUSED' | 'DISTRACTED' | 'NO FACE' | 'ERROR'
          fetch(`/api/meeting/${meetingId}/distraction`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ participantId, status }),
          }).catch(() => {})
        }
      }

      rafRef.current = requestAnimationFrame(loop)
    }

    rafRef.current = requestAnimationFrame(loop)

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [isCameraOn, meetingId, participantId, videoRef])
}

export default useDistractionDetection
