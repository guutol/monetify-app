"use client";

import Image from "next/image";
import { useCallback, useRef, useState } from "react";

interface BeforeAfterSliderProps {
  beforeImageUrl: string;
  afterImageUrl: string;
  beforeLabel?: string;
  afterLabel?: string;
  className?: string;
}

export function BeforeAfterSlider({
  beforeImageUrl,
  afterImageUrl,
  beforeLabel = "Antes",
  afterLabel = "Depois",
  className = "",
}: BeforeAfterSliderProps) {
  const [position, setPosition] = useState(50);
  const containerRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  const updatePosition = useCallback((clientX: number) => {
    const container = containerRef.current;
    if (!container) return;
    const { left, width } = container.getBoundingClientRect();
    const pct = Math.min(100, Math.max(0, ((clientX - left) / width) * 100));
    setPosition(pct);
  }, []);

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      dragging.current = true;
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      updatePosition(e.clientX);
    },
    [updatePosition],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragging.current) return;
      updatePosition(e.clientX);
    },
    [updatePosition],
  );

  const onPointerUp = useCallback(() => {
    dragging.current = false;
  }, []);

  return (
    <div
      ref={containerRef}
      className={`relative aspect-square w-full select-none overflow-hidden rounded-xl bg-zinc-800 ${className}`}
    >
      {/* After image — base layer (full width) */}
      <Image
        src={afterImageUrl}
        alt={afterLabel}
        fill
        className="object-cover"
        draggable={false}
      />

      {/* Before image — clipped to left of divider */}
      <div
        className="absolute inset-0"
        style={{ clipPath: `inset(0 ${100 - position}% 0 0)` }}
      >
        <Image
          src={beforeImageUrl}
          alt={beforeLabel}
          fill
          className="object-cover"
          draggable={false}
        />
      </div>

      {/* Divider line */}
      <div
        className="pointer-events-none absolute inset-y-0 z-10 w-0.5 -translate-x-px bg-white/90 shadow-[0_0_8px_rgba(0,0,0,0.5)]"
        style={{ left: `${position}%` }}
      />

      {/* Drag handle — transparent wider hit area, visible circle in center */}
      <div
        className="absolute inset-y-0 z-20 flex cursor-col-resize touch-none items-center justify-center"
        style={{ left: `calc(${position}% - 20px)`, width: 40 }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/20 bg-white shadow-lg shadow-black/40">
          {/* ← → arrows */}
          <svg
            className="h-4 w-4 text-zinc-600"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M5 4l-3 4 3 4M11 4l3 4-3 4" />
          </svg>
        </div>
      </div>

      {/* Before badge */}
      <div className="pointer-events-none absolute left-3 top-3 z-10">
        <span className="rounded-lg border border-zinc-700 bg-zinc-900/80 px-2.5 py-1 text-xs font-semibold text-zinc-400 backdrop-blur-sm">
          {beforeLabel}
        </span>
      </div>

      {/* After badge */}
      <div className="pointer-events-none absolute right-3 top-3 z-10">
        <span className="rounded-lg border border-emerald-500/30 bg-emerald-500/20 px-2.5 py-1 text-xs font-semibold text-emerald-400 backdrop-blur-sm">
          {afterLabel}
        </span>
      </div>
    </div>
  );
}
