import { cn } from "@/lib/utils";

/** A premium SVG cricket ball icon with radial gradient shading and stitched seams. */
export function CricketBall({ className, spinning = false }: { className?: string; spinning?: boolean }) {
  return (
    <svg
      viewBox="0 0 100 100"
      className={cn("w-6 h-6", spinning && "animate-spin-seam", className)}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <radialGradient id="ballGrad" cx="30%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#e47f89" />
          <stop offset="60%" stopColor="#c8333a" />
          <stop offset="100%" stopColor="#762228" />
        </radialGradient>
      </defs>
      <circle cx="50" cy="50" r="48" fill="url(#ballGrad)" />
      <path
        d="M25 15 Q60 50 75 85"
        stroke="#f5f0e8"
        strokeWidth="3"
        strokeDasharray="4 4"
        fill="none"
        strokeLinecap="round"
      />
      <path
        d="M15 25 Q50 60 85 75"
        stroke="#f5f0e8"
        strokeWidth="3"
        strokeDasharray="4 4"
        fill="none"
        strokeLinecap="round"
      />
    </svg>
  );
}
