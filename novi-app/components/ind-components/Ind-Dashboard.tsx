'use client'

import Speedometer from './Ind-Speedometer';
type Props = {
  stats: any;
  isVideoEnabled: boolean;
  focusedCount: number;
  totalCount: number;
  onClose: () => void;
};

export default function Dashboard({ stats, isVideoEnabled, focusedCount, totalCount, onClose }: Props) {
  // Calculate focus percentage
  const focusPercentage = totalCount > 0 ? (focusedCount / totalCount) * 100 : 0;

   // Helper function to determine head direction based on yaw and pitch
  const getHeadDirection = (yaw: number, pitch: number): string => {
    const YAW_THRESHOLD = 5.0;
    const PITCH_LOW_THRESHOLD = 6.5;
    const PITCH_HIGH_THRESHOLD = 18.0;

    if (yaw < -YAW_THRESHOLD) return "RIGHT";
    if (yaw > YAW_THRESHOLD) return "LEFT";
    if (pitch < PITCH_LOW_THRESHOLD) return "UP";
    if (pitch > PITCH_HIGH_THRESHOLD) return "DOWN";
    return "CENTER";
  };

  return (
    <div className="w-80 bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl p-4">
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-white font-semibold">Distraction Detection</h3>
        <button 
          onClick={onClose} 
          className="text-gray-400 hover:text-white">
          ✕
        </button>
      </div>
      {/* Speedometer */}
      <Speedometer percentage={focusPercentage} />

      {/* Divider */}
      <div className="border-t border-gray-700 my-3"></div>

      {/* Current Status */}

      {!isVideoEnabled ? (
        <p className="text-gray-400 text-sm">Camera turned off</p>
      ) : !stats || stats === null ? (
        <p className="text-gray-400 text-sm">Initializing...</p>
      ) : stats.status === "NO FACE" ? (
        <p className="text-yellow-400 text-sm font-semibold">⚠️ No face detected</p>
      ) : stats.status === "ERROR" ? (
        <p className="text-red-400 text-sm font-semibold">❌ Detection error</p>
      ) : (
        <div className="space-y-3 text-sm">
          {/* Status Badge */}
          <div className="flex items-center gap-2">
            <span className="text-gray-300">Status:</span>
            <span className={`px-3 py-1 rounded-full font-semibold ${
              stats.status === "FOCUSED" 
                ? "bg-green-500/20 text-green-400" 
                : "bg-red-500/20 text-red-400"
            }`}>
              {stats.status === "FOCUSED" ? "✓ FOCUSED" : "⚠ DISTRACTED"}
            </span>
          </div>

          {/* Head Direction */}
          {stats.headPosture && (
            <div className="border-t border-gray-700 pt-2">
              <p className="text-gray-400 mb-1">Head Direction:</p>
              <div className="bg-gray-800 rounded p-2">
                <p className={`font-semibold text-center ${
                  getHeadDirection(stats.headPosture.yaw, stats.headPosture.pitch) === "CENTER"
                    ? "text-green-400"
                    : "text-red-400"
                }`}>
                  {getHeadDirection(stats.headPosture.yaw, stats.headPosture.pitch)}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2 mt-2">
                <div className="bg-gray-800 rounded p-2">
                  <p className="text-gray-500 text-xs">Horizontal</p>
                  <p className="text-white font-mono text-xs">{stats.headPosture.yaw?.toFixed(2)}</p>
                </div>
                <div className="bg-gray-800 rounded p-2">
                  <p className="text-gray-500 text-xs">Vertical</p>
                  <p className="text-white font-mono text-xs">{stats.headPosture.pitch?.toFixed(2)}</p>
                </div>
                <div className="bg-gray-800 rounded p-2">
                  <p className="text-gray-500 text-xs">Yaw</p>
                  <p className="text-white font-mono text-xs">{stats.headPosture.yaw?.toFixed(1)}°</p>
                </div>
                <div className="bg-gray-800 rounded p-2">
                  <p className="text-gray-500 text-xs">Pitch</p>
                   <p className="text-white font-mono text-xs">{stats.headPosture.pitch?.toFixed(1)}°</p>
                </div>
              </div>
            </div>
          )}

          {/* Gaze Direction (only when focused) */}
          {stats.gaze && (
            <div className="border-t border-gray-700 pt-2">
              <p className="text-gray-400 mb-1">Gaze Direction:</p>
              <div className="bg-gray-800 rounded p-2">
                <p className={`font-semibold text-center ${
                  stats.gaze.gaze === "CENTER" ? "text-green-400" : "text-red-400"
                }`}>
                  {stats.gaze.gaze}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2 mt-2">
                <div className="bg-gray-800 rounded p-2">
                  <p className="text-gray-500 text-xs">Horizontal</p>
                  <p className="text-white font-mono text-xs">{stats.gaze.horizontalRatio?.toFixed(2)}</p>
                </div>
                <div className="bg-gray-800 rounded p-2">
                  <p className="text-gray-500 text-xs">Vertical</p>
                  <p className="text-white font-mono text-xs">{stats.gaze.verticalRatio?.toFixed(4)}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}