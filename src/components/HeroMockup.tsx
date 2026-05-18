"use client";

import Image from "next/image";
import { useState, useEffect, useCallback } from "react";

const EXAMPLES = [
  {
    before: "/hero-examples/hero-produto-1-antes.jpg",
    after: "/hero-examples/hero-produto-1-depois.png",
    label: "Produto real",
  },
  {
    before: "/hero-examples/hero-produto-2-antes.png",
    after: "/hero-examples/hero-produto-2-depois.png",
    label: "Produto real",
  },
];

const INTERVAL_MS = 3800;
const FADE_MS = 280;

export function HeroMockup() {
  const [active, setActive] = useState(0);
  const [visible, setVisible] = useState(true);

  const goTo = useCallback((index: number) => {
    setVisible(false);
    setTimeout(() => {
      setActive(index);
      setVisible(true);
    }, FADE_MS);
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      goTo((active + 1) % EXAMPLES.length);
    }, INTERVAL_MS);
    return () => clearInterval(timer);
  }, [active, goTo]);

  const example = EXAMPLES[active];

  return (
    <div className="relative mx-auto w-full max-w-sm">
      {/* Main card */}
      <div className="relative rounded-2xl border border-zinc-700/60 bg-zinc-900/80 p-5 shadow-2xl backdrop-blur-sm">
        {/* Card header */}
        <div className="mb-4 flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
            Monetify
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/20 px-2.5 py-1 text-xs font-medium text-emerald-400">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            Pronto
          </span>
        </div>

        {/* Before / After */}
        <div
          className="relative grid grid-cols-2 gap-3"
          style={{
            opacity: visible ? 1 : 0,
            transition: `opacity ${FADE_MS}ms ease-in-out`,
          }}
        >
          {/* Before — foto original */}
          <div>
            <div className="relative aspect-square overflow-hidden rounded-xl bg-zinc-800">
              <Image
                src={example.before}
                alt="Foto original do produto"
                fill
                className="object-cover"
                sizes="160px"
                priority
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
              <div className="absolute bottom-2 left-2 rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-medium text-zinc-300 backdrop-blur-sm">
                Foto original
              </div>
            </div>
          </div>

          {/* After — imagem gerada */}
          <div>
            <div className="relative aspect-square overflow-hidden rounded-xl bg-white shadow-inner">
              <Image
                src={example.after}
                alt="Imagem gerada pelo Monetify"
                fill
                className="object-cover"
                sizes="160px"
                priority
              />
              <div className="absolute bottom-2 left-2 rounded bg-black/10 px-1.5 py-0.5 text-[10px] font-medium text-zinc-600 backdrop-blur-sm">
                Imagem gerada
              </div>
            </div>
          </div>

          {/* Arrow */}
          <div className="absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2 rounded-full border border-zinc-700 bg-zinc-900 px-2 py-1 text-xs font-bold text-emerald-400 shadow-lg">
            →
          </div>
        </div>

        {/* Status bar */}
        <div className="mt-4 flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-2.5">
          <span className="text-sm text-emerald-400">✓</span>
          <span className="text-xs font-medium text-emerald-300">Pronta para marketplace</span>
        </div>

        {/* Price row + dots */}
        <div className="mt-3 flex items-center justify-between border-t border-zinc-800 pt-3">
          <span className="text-xs text-zinc-500">Custo por imagem</span>
          <div className="flex items-center gap-3">
            {/* Carousel dots */}
            <div className="flex items-center gap-1">
              {EXAMPLES.map((_, i) => (
                <button
                  key={i}
                  onClick={() => goTo(i)}
                  aria-label={`Exemplo ${i + 1}`}
                  className="rounded-full transition-all duration-300 focus:outline-none"
                  style={{
                    width: i === active ? "16px" : "6px",
                    height: "6px",
                    backgroundColor: i === active ? "rgb(52 211 153)" : "rgb(63 63 70)",
                  }}
                />
              ))}
            </div>
            <span className="text-sm font-bold text-white">R$ 9,90</span>
          </div>
        </div>
      </div>

      {/* Floating platform badges */}
      <div className="absolute -bottom-4 -left-2 flex gap-1.5">
        {["Shopee", "Mercado Livre", "TikTok Shop", "Instagram"].map((p) => (
          <span
            key={p}
            className="rounded-full border border-zinc-700 bg-zinc-900 px-2.5 py-1 text-xs font-medium text-zinc-400 shadow-lg"
          >
            {p}
          </span>
        ))}
      </div>

      {/* Floating AI badge */}
      <div className="absolute -right-3 -top-3 rounded-xl bg-emerald-500 px-2.5 py-1 text-xs font-bold text-white shadow-lg shadow-emerald-500/40">
        IA
      </div>
    </div>
  );
}
