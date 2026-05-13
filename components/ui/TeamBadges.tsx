"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

/**
 * Shortens team names to their shortest unambiguous form for the badge label.
 */
function getAbbreviation(code: string): string {
  // H1-H5 mapping
  if (code.includes("Kampong 1") || code === "H1") return "H1";
  if (code.includes("Kampong 2") || code === "H2") return "H2";
  if (code.includes("Kampong 3") || code === "H3") return "H3";
  if (code.includes("Kampong 4") || code === "H4") return "H4";
  if (code.includes("Kampong 5") || code === "H5") return "H5";

  // Zami/Zomi mapping
  if (code.includes("Kampong Za 1") || code === "Zami 1") return "ZA1";
  if (code.includes("Kampong Za 2") || code === "Zami 2") return "ZA2";
  if (code.includes("Kampong Zo 1") || code === "Zomi") return "ZO1";

  // T20 / Other
  if (code.includes("TK T20")) return "T20-1";
  if (code.includes("HK T20")) return "T20-2";
  if (code.includes("Lagereklasse")) return "T20-L";

  return code.slice(0, 3).toUpperCase();
}

/**
 * Determines if a team is recreational based on its code.
 */
function isRecreational(code: string): boolean {
  const c = code.toLowerCase();
  return (
    c.includes("za") ||
    c.includes("zo") ||
    c.includes("zami") ||
    c.includes("zomi")
  );
}

interface TeamBadgesProps {
  teamCodes: string[];
}

/**
 * Smart team badge container with overflow handling and smooth expansion.
 */
export function TeamBadges({ teamCodes }: TeamBadgesProps) {
  const [expanded, setExpanded] = useState(false);

  // Responsive limits (viewport < 480px)
  const isMobile = typeof window !== "undefined" && window.innerWidth < 480;
  const maxBeforeTruncate = isMobile ? 2 : 3;
  const shouldTruncate = teamCodes.length > maxBeforeTruncate;

  // When collapsed, show (max - 1) badges + the overflow pill
  const displayCodes =
    !expanded && shouldTruncate
      ? teamCodes.slice(0, maxBeforeTruncate - 1)
      : teamCodes;

  const overflowCount = teamCodes.length - displayCodes.length;

  return (
    <div className="flex flex-col items-end gap-1">
      <div
        className={cn(
          "flex items-center gap-1 transition-all duration-200 ease-out",
          expanded
            ? "flex-wrap justify-end max-w-full"
            : "flex-nowrap max-w-[160px] overflow-hidden",
        )}
        style={{
          maxHeight: expanded ? "96px" : "24px",
        }}
        onMouseEnter={() => shouldTruncate && setExpanded(true)}
      >
        <ul
          className={cn(
            "flex gap-1",
            expanded ? "flex-wrap justify-end" : "flex-nowrap",
          )}
          role="list"
        >
          <AnimatePresence mode="popLayout">
            {displayCodes.map((code) => (
              <motion.li
                key={code}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
              >
                <span
                  className={cn(
                    "px-2 py-0.5 rounded-full text-[11px] font-semibold tracking-wider whitespace-nowrap border transition-colors",
                    isRecreational(code)
                      ? "bg-success/10 border-success/30 text-success"
                      : "bg-background border-border text-white",
                  )}
                >
                  {getAbbreviation(code)}
                </span>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>

        {!expanded && shouldTruncate && (
          <motion.button
            layout
            onClick={(e) => {
              e.stopPropagation();
              setExpanded(true);
            }}
            className="px-2 py-0.5 rounded-full text-[11px] font-semibold tracking-wider bg-surface border border-border text-foreground-muted hover:text-foreground transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-crimson whitespace-nowrap"
            aria-label={`Show all ${teamCodes.length} teams playing this day`}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            +{overflowCount} more
          </motion.button>
        )}
      </div>
    </div>
  );
}
