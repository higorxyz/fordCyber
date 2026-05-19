"use client";

import { motion } from "framer-motion";

interface Section {
  id: string;
  label: string;
  code: string;
}

interface Props {
  sections: Section[];
  active: string;
  onSelect: (id: string) => void;
}

export default function SectionNav({ sections, active, onSelect }: Props) {
  const activeIdx = sections.findIndex((s) => s.id === active);

  return (
    <div className="fixed left-0 top-1/2 -translate-y-1/2 z-30 flex items-stretch gap-3 pl-5">
      <div className="relative w-[2px] bg-white/10 self-stretch" style={{ minHeight: sections.length * 56 }}>
        <motion.div
          className="absolute left-0 w-full bg-ford-blue-light"
          initial={false}
          animate={{
            top: `${(activeIdx / sections.length) * 100}%`,
            height: `${(1 / sections.length) * 100}%`,
          }}
          transition={{ type: "spring", damping: 25, stiffness: 200 }}
        />
      </div>

      <div className="flex flex-col justify-between" style={{ minHeight: sections.length * 56 }}>
        {sections.map((s) => {
          const isActive = s.id === active;
          return (
            <button
              key={s.id}
              onClick={() => onSelect(s.id)}
              className={`group flex items-center gap-3 py-2 text-left transition-all duration-300 ${
                isActive ? "opacity-100" : "opacity-30 hover:opacity-60"
              }`}
            >
              <span
                className={`font-mono-tech text-[10px] tabular-nums transition-colors duration-300 ${
                  isActive ? "text-ford-blue-light" : "text-white/50"
                }`}
              >
                {s.code}
              </span>
              <span
                className={`font-display text-[11px] uppercase transition-all duration-300 ${
                  isActive
                    ? "tracking-[0.5em] text-white"
                    : "tracking-[0.3em] text-white/60"
                }`}
              >
                {s.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
