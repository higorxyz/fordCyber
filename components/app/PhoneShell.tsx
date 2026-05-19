"use client";

import { ReactNode } from "react";
import { Wifi, Signal, BatteryFull } from "lucide-react";

interface Props {
  children: ReactNode;
}

export default function PhoneShell({ children }: Props) {
  return (
    <div className="phone-frame w-[400px] h-[820px] flex flex-col">
      <div className="flex items-center justify-between px-6 pt-3 pb-1 text-[11px] text-white/80">
        <span className="font-semibold">9:41</span>
        <div className="flex items-center gap-1">
          <Signal className="w-3 h-3" />
          <Wifi className="w-3 h-3" />
          <BatteryFull className="w-4 h-4" />
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">{children}</div>
    </div>
  );
}
