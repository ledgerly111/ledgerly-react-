import React from "react";

export default function NetworkIcon({
  size = 48,
  strokeColor = "currentColor",
  solidColor = "currentColor",
  strokeWidth = 1,
  solidCircles = [0, 2, 5],
}) {
  const circles = [
    { cx: 40, cy: 24, r: 5 },
    { cx: 35.314, cy: 12.686, r: 3 },
    { cx: 24, cy: 8, r: 6 },
    { cx: 12.686, cy: 12.686, r: 4 },
    { cx: 8, cy: 24, r: 3 },
    { cx: 12.686, cy: 35.314, r: 5 },
    { cx: 24, cy: 40, r: 3 },
    { cx: 35.314, cy: 35.314, r: 4 },
  ];

  const spokes = [
    { x2: 35, y2: 24 },
    { x2: 31.778, y2: 16.222 },
    { x2: 24, y2: 14 },
    { x2: 16.222, y2: 16.222 },
    { x2: 14, y2: 24 },
    { x2: 16.222, y2: 31.778 },
    { x2: 24, y2: 35 },
    { x2: 32.486, y2: 32.486 },
  ];

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      stroke={strokeColor}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-label="AI network icon"
    >
      {spokes.map((spoke, index) => (
        <line key={`spoke-${index}`} x1={24} y1={24} x2={spoke.x2} y2={spoke.y2} />
      ))}
      {circles.map((circle, index) => (
        <circle
          key={`node-${index}`}
          cx={circle.cx}
          cy={circle.cy}
          r={circle.r}
          fill={solidCircles.includes(index) ? solidColor : "none"}
        />
      ))}
    </svg>
  );
}
