import ReactSpeedometer from 'react-d3-speedometer';

type SpeedometerProps = {
  distractedCount: number;
  totalCount: number;
};

export default function GroupSpeedometer({ distractedCount, totalCount }: SpeedometerProps) {
  // Distraction percentage: 0 = nobody distracted, 100 = everyone distracted
  const distractionPct = totalCount > 0 ? (distractedCount / totalCount) * 100 : 0;
  const clamped = Math.max(0, Math.min(100, distractionPct));

  // Color: green (low distraction) → yellow → red (high distraction)
  const getColor = (pct: number) => {
    if (pct < 30) return '#22c55e';  // green
    if (pct < 60) return '#eab308';  // yellow
    return '#ef4444';                // red
  };

  const color = getColor(clamped);

  return (
    <div className="flex flex-col items-center">
      <ReactSpeedometer
        key={color}
        value={clamped}
        minValue={0}
        maxValue={100}
        width={240}
        height={160}
        needleColor={color}
        startColor="#22c55e"
        endColor="#ef4444"
        segments={3}
        segmentColors={['#22c55e', '#eab308', '#ef4444']}
        ringWidth={28}
        needleHeightRatio={0.7}
        needleTransitionDuration={0}
        currentValueText=""
        textColor="transparent"
      />

      {/* Distraction % */}
      <div className="text-center -mt-4">
        <div className="text-2xl font-bold" style={{ color }}>
          {clamped.toFixed(0)}%
        </div>
        <div className="text-xs text-gray-400 mt-0.5">Distraction Level</div>
      </div>

      {/* Numeric counts */}
      <div className="mt-3 flex items-center gap-3 text-sm">
        <span className="text-red-400 font-semibold">{distractedCount} distracted</span>
        <span className="text-gray-600">·</span>
        <span className="text-gray-400">{totalCount} total</span>
      </div>
    </div>
  );
}
