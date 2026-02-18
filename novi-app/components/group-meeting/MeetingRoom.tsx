'use client'

import { useEffect, useRef, useState } from 'react'
import { useUser } from '@clerk/nextjs'
import {
  VideoCameraIcon,
  VideoCameraSlashIcon,
  MicrophoneIcon,
  SpeakerXMarkIcon,
  UsersIcon,
  ChartBarIcon,
} from '@heroicons/react/24/solid'
import EndCallButton from './EndCallButton'
import ParticipantsPanel from './ParticipantsPanel'
import GroupDashboard from './Group-Dashboard'
import useCopyLink from '@/hooks/useCopyLink'
import useParticipants from '@/hooks/useParticipants'
import useDistractionDetection from '@/hooks/useDistractionDetection'

interface MeetingRoomProps {
  meetingId: string
  initialCameraOn: boolean
  initialMicOn: boolean
  isHost: boolean
  description?: string
}

const MeetingRoom = ({
  meetingId,
  initialCameraOn,
  initialMicOn,
  isHost,
  description,
}: MeetingRoomProps) => {
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const [isCameraOn, setIsCameraOn] = useState(initialCameraOn)
  const [isMicOn, setIsMicOn] = useState(initialMicOn)
  const [cameraError, setCameraError] = useState(false)
  const [showParticipants, setShowParticipants] = useState(false)
  const [showDashboard, setShowDashboard] = useState(false)

  const { copied, copyLink } = useCopyLink()
  const { user } = useUser()

  const participantId = user?.id ?? ''
  const participantName =
    user?.fullName ??
    user?.firstName ??
    user?.username ??
    user?.primaryEmailAddress?.emailAddress ??
    'Guest'

  const { participants } = useParticipants({
    meetingId,
    participantId,
    name: participantName,
    isHost,
    isCameraOn,
    isMicOn,
  })

  // Run distraction detection locally on this participant's webcam
  useDistractionDetection({
    videoRef,
    meetingId,
    participantId,
    isCameraOn,
  })

  useEffect(() => {
    const startStream = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        })
        streamRef.current = stream
        stream.getVideoTracks().forEach((t) => (t.enabled = initialCameraOn))
        stream.getAudioTracks().forEach((t) => (t.enabled = initialMicOn))
        if (videoRef.current) {
          videoRef.current.srcObject = stream
        }
      } catch (err) {
        console.error('Could not access camera/mic:', err)
        setCameraError(true)
      }
    }
    startStream()

    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop())
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const toggleCamera = () => {
    const next = !isCameraOn
    setIsCameraOn(next)
    streamRef.current?.getVideoTracks().forEach((t) => (t.enabled = next))
  }

  const toggleMic = () => {
    const next = !isMicOn
    setIsMicOn(next)
    streamRef.current?.getAudioTracks().forEach((t) => (t.enabled = next))
  }

  // Only one side panel open at a time
  const handleToggleParticipants = () => {
    setShowDashboard(false)
    setShowParticipants((prev) => !prev)
  }

  const handleToggleDashboard = () => {
    setShowParticipants(false)
    setShowDashboard((prev) => !prev)
  }

  const anyPanelOpen = showParticipants || showDashboard

  return (
    <div className="h-screen bg-gray-950 flex flex-col overflow-hidden">

      {/* Meeting description */}
      {description && (
        <div className="flex-shrink-0 flex justify-center pt-4 z-10">
          <div className="bg-gray-800/80 backdrop-blur-sm text-white text-sm px-5 py-2 rounded-full shadow-lg">
            {description}
          </div>
        </div>
      )}

      {/* Main content row */}
      <div
        className="flex-1 flex items-stretch justify-center gap-3 px-4 pb-24 pt-3 min-h-0"
        style={{ maxWidth: anyPanelOpen ? '1400px' : '100%', margin: '0 auto', width: '100%' }}
      >
        {/* Video tile */}
        <div className="relative flex-1 min-w-0 bg-gray-800 rounded-2xl overflow-hidden shadow-2xl">
          {(cameraError || !isCameraOn) && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 z-10">
              <div className="w-24 h-24 rounded-full bg-gray-700 flex items-center justify-center">
                <VideoCameraSlashIcon className="w-12 h-12 text-gray-400" />
              </div>
              <p className="text-gray-400 text-sm">
                {cameraError ? 'Camera unavailable' : 'Camera is off'}
              </p>
            </div>
          )}
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            className={`w-full h-full object-cover scale-x-[-1] transition-opacity duration-300
              ${isCameraOn && !cameraError ? 'opacity-100' : 'opacity-0'}`}
          />
          {!isMicOn && (
            <div className="absolute bottom-3 left-3 z-20 bg-red-600/90 text-white text-xs
              font-semibold px-2.5 py-1 rounded-full flex items-center gap-1.5">
              <SpeakerXMarkIcon className="w-3.5 h-3.5" />
              Muted
            </div>
          )}
        </div>

        {/* Participants panel */}
        {showParticipants && (
          <ParticipantsPanel
            participants={participants}
            isOpen={showParticipants}
            onClose={() => setShowParticipants(false)}
            copied={copied}
            copyLink={copyLink}
          />
        )}

        {/* Dashboard panel — host only */}
        {isHost && showDashboard && (
          <GroupDashboard
            meetingId={meetingId}
            isOpen={showDashboard}
            onClose={() => setShowDashboard(false)}
          />
        )}
      </div>

      {/* ── Bottom Navbar ── */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50
        flex items-center gap-3 bg-gray-900/90 backdrop-blur-md
        px-6 py-3 rounded-full shadow-2xl border border-gray-700/50">

        {/* Camera toggle */}
        <button
          onClick={toggleCamera}
          aria-label={isCameraOn ? 'Turn camera off' : 'Turn camera on'}
          className="flex flex-col items-center gap-1 group"
        >
          <div className={`w-12 h-12 rounded-full flex items-center justify-center
            transition-all duration-200 hover:scale-110
            ${isCameraOn ? 'bg-gray-700 hover:bg-gray-600' : 'bg-red-600 hover:bg-red-700'}`}>
            {isCameraOn
              ? <VideoCameraIcon className="w-6 h-6 text-white" />
              : <VideoCameraSlashIcon className="w-6 h-6 text-white" />}
          </div>
          <span className="text-[10px] text-gray-400 group-hover:text-gray-200 transition-colors">
            {isCameraOn ? 'Camera' : 'Camera Off'}
          </span>
        </button>

        {/* Mic toggle */}
        <button
          onClick={toggleMic}
          aria-label={isMicOn ? 'Mute microphone' : 'Unmute microphone'}
          className="flex flex-col items-center gap-1 group"
        >
          <div className={`w-12 h-12 rounded-full flex items-center justify-center
            transition-all duration-200 hover:scale-110
            ${isMicOn ? 'bg-gray-700 hover:bg-gray-600' : 'bg-red-600 hover:bg-red-700'}`}>
            {isMicOn
              ? <MicrophoneIcon className="w-6 h-6 text-white" />
              : <SpeakerXMarkIcon className="w-6 h-6 text-white" />}
          </div>
          <span className="text-[10px] text-gray-400 group-hover:text-gray-200 transition-colors">
            {isMicOn ? 'Mic' : 'Muted'}
          </span>
        </button>

        {/* Divider */}
        <div className="w-px h-8 bg-gray-700 mx-1" />

        {/* Participants toggle */}
        <button
          onClick={handleToggleParticipants}
          aria-label="Toggle participants panel"
          className="flex flex-col items-center gap-1 group"
        >
          <div className={`w-12 h-12 rounded-full flex items-center justify-center
            transition-all duration-200 hover:scale-110 relative
            ${showParticipants ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-700 hover:bg-gray-600'}`}>
            <UsersIcon className="w-6 h-6 text-white" />
            {participants.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-blue-500 text-white text-[9px]
                font-bold w-4 h-4 rounded-full flex items-center justify-center shadow">
                {participants.length > 9 ? '9+' : participants.length}
              </span>
            )}
          </div>
          <span className="text-[10px] text-gray-400 group-hover:text-gray-200 transition-colors">
            People
          </span>
        </button>

        {/* Dashboard button — host only */}
        {isHost && (
          <button
            onClick={handleToggleDashboard}
            aria-label="Toggle group dashboard"
            className="flex flex-col items-center gap-1 group"
          >
            <div className={`w-12 h-12 rounded-full flex items-center justify-center
              transition-all duration-200 hover:scale-110
              ${showDashboard ? 'bg-purple-600 hover:bg-purple-700' : 'bg-gray-700 hover:bg-gray-600'}`}>
              <ChartBarIcon className="w-6 h-6 text-white" />
            </div>
            <span className="text-[10px] text-gray-400 group-hover:text-gray-200 transition-colors">
              Dashboard
            </span>
          </button>
        )}

        {isHost && <div className="w-px h-8 bg-gray-700 mx-1" />}
        {isHost && <EndCallButton meetingId={meetingId} streamRef={streamRef} />}
      </div>
    </div>
  )
}

export default MeetingRoom
