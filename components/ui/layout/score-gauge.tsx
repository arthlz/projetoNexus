interface ScoreGaugeProps {
  score: number;
  size?: "large" | "small";
}

export const ScoreGauge = ({ score, size = "large" }: ScoreGaugeProps) => {
  const radius = size === "large" ? 80 : 50
  const strokeWidth = size === "large" ? 12 : 8
  const circumference = 2 * Math.PI * radius
  const progress = (score / 100) * circumference
  const color = score >= 80 ? "#22c55e" : score >= 60 ? "#eab308" : "#ef4444"

  return (
    <div className="relative flex items-center justify-center">
      <svg
        width={radius * 2 + strokeWidth * 2}
        height={radius * 2 + strokeWidth * 2}
        className="transform -rotate-90"
      >
        <circle
          cx={radius + strokeWidth}
          cy={radius + strokeWidth}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-muted"
        />
        <circle
          cx={radius + strokeWidth}
          cy={radius + strokeWidth}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={circumference - progress}
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className={`font-bold ${size === "large" ? "text-4xl" : "text-2xl"} text-foreground`}>
          {score}
        </span>
        <span className="text-muted-foreground text-sm">/100</span>
      </div>
    </div>
  )
}