"use client";

import React, { useState } from "react";
import { BRAND_CONFIG } from "@/config/brand";

interface AmorinoLogoProps {
  size?: number | string;
  className?: string;
  priority?: boolean;
  ringGlow?: boolean;
  alt?: string;
}

/**
 * Renders the exact official Amorino Cafe & Restaurant logo (logo1111.png).
 * Strictly preserves 1:1 proportions, original colors, and circular medallion framing.
 */
export function AmorinoLogo({
  size = 48,
  className = "",
  ringGlow = false,
  alt = "Amorino Cafe & Restaurant Official Logo",
}: AmorinoLogoProps) {
  const [src, setSrc] = useState<string>(BRAND_CONFIG.localLogoPath);
  const [fallbackTried, setFallbackTried] = useState(false);

  const handleError = () => {
    if (!fallbackTried) {
      setFallbackTried(true);
      setSrc(BRAND_CONFIG.officialLogoUrl);
    }
  };

  const dimensionStyle =
    typeof size === "number"
      ? { width: `${size}px`, height: `${size}px`, minWidth: `${size}px`, minHeight: `${size}px` }
      : undefined;

  return (
    <div
      style={dimensionStyle}
      className={`relative inline-flex items-center justify-center rounded-full overflow-hidden select-none bg-[#050302] shrink-0 ${
        ringGlow ? "shadow-[0_0_35px_rgba(212,168,83,0.28)]" : ""
      } ${className}`}
    >
      <img
        src={src}
        alt={alt}
        onError={handleError}
        draggable={false}
        className="w-full h-full object-contain block"
      />
    </div>
  );
}
