"use client";

import { useMemo } from "react";

export default function CarViewer3D() {
  const bars = useMemo(() => Array.from({ length: 9 }, (_, index) => index), []);

  return (
    <div className="absolute inset-0 overflow-hidden bg-black">
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at 50% 42%, rgba(0, 104, 214, 0.22), transparent 58%), radial-gradient(circle at 50% 100%, rgba(0, 52, 120, 0.45), transparent 62%)",
        }}
      />

      <div className="absolute inset-x-0 bottom-14 h-px bg-gradient-to-r from-transparent via-ford-blue-light/40 to-transparent" />

      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="relative w-[78%] max-w-[460px] aspect-[16/7]">
          <div className="absolute inset-0 border border-ford-blue-light/35 rounded-[26px] bg-ford-blue-light/5 backdrop-blur-[1px]" />
          <div className="absolute left-[10%] right-[10%] top-[14%] bottom-[36%] border border-ford-blue-light/45 rounded-[22px]" />
          <div className="absolute left-[7%] right-[7%] bottom-[20%] h-[24%] border border-ford-blue-light/30 rounded-[12px]" />
          <div className="absolute left-[17%] bottom-[7%] w-[18%] h-[18%] border border-ford-blue-light/45 rounded-full bg-ford-blue-light/10" />
          <div className="absolute right-[17%] bottom-[7%] w-[18%] h-[18%] border border-ford-blue-light/45 rounded-full bg-ford-blue-light/10" />
        </div>
      </div>

      <div className="absolute left-4 top-4 text-[9px] font-mono-tech uppercase tracking-[0.3em] text-ford-blue-light/55">
        Simulacao visual
      </div>

      <div className="absolute inset-x-0 bottom-6 flex justify-center gap-2 px-8">
        {bars.map((bar) => (
          <span
            key={bar}
            className="h-1 rounded-full bg-ford-blue-light/35 animate-pulse"
            style={{
              width: `${24 + (bar % 3) * 12}px`,
              animationDelay: `${bar * 0.18}s`,
            }}
          />
        ))}
      </div>
    </div>
  );
}
