"use client";

import React, { useEffect, useState } from "react";
import { AmorinoLogo } from "./AmorinoLogo";

interface CinematicIntroProps {
  tableCode?: string;
  skipLabel: string;
  tableLabel: string;
  onComplete: () => void;
}

/**
 * 5.2-second luxury brand film opening sequence for Amorino Cafe & Restaurant.
 * Respects prefers-reduced-motion automatically.
 */
export function CinematicIntro({
  tableCode,
  skipLabel,
  tableLabel,
  onComplete,
}: CinematicIntroProps) {
  // Stage 0: Dark quiet obsidian (0–400ms)
  // Stage 1: Logo emerges from soft blur + ambient light (400–1800ms)
  // Stage 2: Soft golden light sweep passes through & logo sharpens (1800–3600ms)
  // Stage 3: Editorial subtitle & table recognition settle (3600–4600ms)
  // Stage 4: Curtain dissolve into menu (4600–5300ms)
  const [stage, setStage] = useState<number>(0);
  const [reducedMotion, setReducedMotion] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (mediaQuery.matches) {
      setReducedMotion(true);
      const quickTimer = setTimeout(() => {
        onComplete();
      }, 600);
      return () => clearTimeout(quickTimer);
    }

    const t1 = setTimeout(() => setStage(1), 250);
    const t2 = setTimeout(() => setStage(2), 1500);
    const t3 = setTimeout(() => setStage(3), 2900);
    const t4 = setTimeout(() => setStage(4), 4500);
    const t5 = setTimeout(() => onComplete(), 5250);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
      clearTimeout(t5);
    };
  }, [onComplete]);

  if (reducedMotion) {
    return (
      <div className="fixed inset-0 z-50 bg-obsidian flex flex-col items-center justify-center p-6">
        <AmorinoLogo size={140} />
        <p className="mt-6 font-serif text-2xl tracking-[0.2em] text-crema uppercase">
          Amorino Cafe & Restaurant
        </p>
        <button
          onClick={onComplete}
          className="mt-8 text-xs uppercase tracking-[0.25em] text-gold hover:text-gold-light"
        >
          {skipLabel}
        </button>
      </div>
    );
  }

  return (
    <div
      className={`fixed inset-0 z-50 bg-obsidian flex flex-col items-center justify-center overflow-hidden transition-all duration-700 ease-out ${
        stage === 4
          ? "opacity-0 scale-[1.03] pointer-events-none"
          : "opacity-100 scale-100"
      }`}
      role="dialog"
      aria-label="Amorino Cafe & Restaurant Cinematic Intro"
    >
      {/* 1. Extremely subtle warm espresso/gold ambient movement */}
      <div
        className={`absolute w-[540px] h-[540px] rounded-full pointer-events-none transition-all duration-[2400ms] ease-out ${
          stage >= 1 ? "opacity-35 scale-105" : "opacity-0 scale-90"
        }`}
        style={{
          background:
            "radial-gradient(circle, rgba(212,168,83,0.18) 0%, rgba(110,62,30,0.08) 45%, rgba(7,5,4,0) 72%)",
          filter: "blur(40px)",
        }}
      />

      {/* Subtle architectural vignette rings */}
      <div
        className={`absolute w-[340px] h-[340px] sm:w-[440px] sm:h-[440px] rounded-full border border-gold/10 pointer-events-none transition-all duration-[2200ms] ease-out ${
          stage >= 2 ? "opacity-100 scale-100" : "opacity-0 scale-90"
        }`}
      />

      {/* Center Medallion Stage */}
      <div className="relative z-10 flex flex-col items-center px-6 text-center">
        {/* 2 & 3. Official Amorino Logo emerging from soft blur to razor sharpness */}
        <div
          className={`relative rounded-full transition-all duration-[1800ms] cubic-bezier(0.16, 1, 0.3, 1) ${
            stage === 0
              ? "opacity-0 scale-[0.88] blur-xl"
              : stage === 1
              ? "opacity-85 scale-[0.96] blur-[3px]"
              : "opacity-100 scale-100 blur-0"
          }`}
        >
          <AmorinoLogo
            size={184}
            ringGlow={stage >= 2}
            className="border border-gold/25"
          />

          {/* 4. Soft golden light sweep passing across the emblem */}
          {stage >= 2 && (
            <div className="absolute inset-0 rounded-full overflow-hidden pointer-events-none">
              <div
                className="w-1/2 h-[220%] -top-1/2 bg-gradient-to-r from-transparent via-gold-bright/30 to-transparent animate-light-sweep"
                style={{ filter: "blur(8px)" }}
              />
            </div>
          )}
        </div>

        {/* 5. Editorial Brand Typography Reveal */}
        <div
          className={`mt-8 transition-all duration-1000 ease-out ${
            stage >= 2
              ? "opacity-100 translate-y-0"
              : "opacity-0 translate-y-3"
          }`}
        >
          <p className="text-[10px] sm:text-xs uppercase tracking-[0.38em] text-gold/90 font-medium mb-2">
            KENYA • SPECIALTY ROASTERY & DINING SALON
          </p>
          <h1 className="font-serif text-3xl sm:text-4xl md:text-5xl text-crema tracking-[0.06em] font-normal">
            Amorino Cafe &amp; Restaurant
          </h1>
        </div>

        {/* Discreet Table Recognition Pill */}
        <div
          className={`mt-6 transition-all duration-1000 delay-150 ease-out ${
            stage >= 3
              ? "opacity-100 translate-y-0"
              : "opacity-0 translate-y-2"
          }`}
        >
          {tableCode && (
            <span className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-umber/90 border border-gold/25 text-[11px] uppercase tracking-[0.28em] text-champagne font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-gold animate-pulse" />
              {tableLabel} {tableCode.replace(/^T0?/, "")}
            </span>
          )}
        </div>
      </div>

      {/* Skip → control (always accessible) */}
      <div className="absolute bottom-8 sm:bottom-10 right-6 sm:right-10 z-20">
        <button
          onClick={onComplete}
          className="px-5 py-2.5 rounded-full bg-umber/80 hover:bg-roast border border-gold/25 hover:border-gold/50 text-xs tracking-[0.22em] uppercase text-champagne hover:text-crema transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-gold/50"
        >
          {skipLabel}
        </button>
      </div>

      {/* Subtle progress hairline at very bottom */}
      <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-roast overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-gold-bronze via-gold to-gold-bright transition-all duration-[4800ms] ease-out"
          style={{ width: stage >= 1 ? "100%" : "0%" }}
        />
      </div>
    </div>
  );
}
