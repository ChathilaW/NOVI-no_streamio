'use client'

import { XMarkIcon, ChartBarIcon } from '@heroicons/react/24/solid'
import GroupSpeedometer from './Group-Speedometer'
import useGroupDistraction from '@/hooks/useGroupDistraction'

type Props = {
  meetingId: string
  isOpen: boolean
  onClose: () => void
}

export default function GroupDashboard({ meetingId, isOpen, onClose }: Props) {
  const { distractedCount, totalCount } = useGroupDistraction(meetingId)

  if (!isOpen) return null

  return (
    <div
      className="
        flex flex-col
        w-72 flex-shrink-0
        bg-gray-900/95 backdrop-blur-md
        rounded-2xl
        border border-gray-700/50
        shadow-2xl
        overflow-hidden
        animate-slide-in-right
      "
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700/50 flex-shrink-0">
        <div className="flex items-center gap-2">
          <ChartBarIcon className="w-4 h-4 text-purple-400" />
          <span className="text-white font-semibold text-sm">Group Dashboard</span>
        </div>
        <button
          onClick={onClose}
          aria-label="Close dashboard"
          className="w-6 h-6 rounded-full flex items-center justify-center
            text-gray-400 hover:text-white hover:bg-gray-700 transition-all duration-150"
        >
          <XMarkIcon className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Speedometer */}
      <div className="flex-1 flex items-center justify-center px-4 py-6 min-h-0">
        {totalCount === 0 ? (
          <div className="text-center">
            <p className="text-gray-500 text-sm">Waiting for participants…</p>
            <p className="text-gray-600 text-xs mt-1">Detection starts when cameras are on</p>
          </div>
        ) : (
          <GroupSpeedometer
            distractedCount={distractedCount}
            totalCount={totalCount}
          />
        )}
      </div>
    </div>
  )
}