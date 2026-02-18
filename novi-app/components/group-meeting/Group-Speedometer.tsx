import ReactSpeedometer from 'react-d3-speedometer';

type SpeedometerProps = {
  percentage: number; // 0-100
};

export default function Speedometer({ percentage }: SpeedometerProps) {
  // Clamp percentage between 0 and 100
  const clampedPercentage = Math.max(0, Math.min(100, percentage));
  
  // Determine color based on percentage
  const getColor = (pct: number) => {
    if (pct < 40) return '#ef4444'; // Red
    if (pct < 70) return '#eab308'; // Yellow
    return '#22c55e'; // Green
  };

  const color = getColor(clampedPercentage);

  return (
    <div className="flex flex-col items-center mb-4">
      <ReactSpeedometer
        key={color}
        value={clampedPercentage}
        minValue={0}
        maxValue={100}
        width={260}
        height={180}
        needleColor={color}
        startColor={color}
        segments={1}
        endColor={color}
        segmentColors={[color]}
        ringWidth={30}
        needleHeightRatio={0.7}
        needleTransitionDuration={0}
        currentValueText=""
        textColor="transparent"
      />
      
      {/* Percentage display */}
      <div className="text-center -mt-6">
        <div className="text-3xl font-bold" style={{ color }}>
          {clampedPercentage.toFixed(0)}%
        </div>
        <div className="text-xs text-gray-400 mt-1">Focus Score</div>
      </div>
    </div>
  );
}
