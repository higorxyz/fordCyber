"use client";

import { motion } from "framer-motion";
import { AlertTriangle, Calendar, Tag, MapPin, ChevronRight } from "lucide-react";
import { client } from "@/data/client";

const URGENCY = {
  low: { label: "Baixa", color: "border-l-green-500", text: "text-green-400" },
  mid: { label: "Média", color: "border-l-yellow-500", text: "text-yellow-400" },
  high: { label: "Alta", color: "border-l-ford-red", text: "text-ford-red" },
};

export default function Alerts() {
  return (
    <div className="px-5 py-5 space-y-4">
      <div>
        <h1 className="font-display text-3xl font-bold tracking-[0.05em] uppercase">
          <span className="text-ford-blue-light">/</span> Alertas
        </h1>
        <p className="text-[11px] text-white/50 mt-1">
          Inteligência preditiva baseada no seu uso
        </p>
      </div>

      <div className="space-y-3">
        {client.alerts.map((a, i) => {
          const u = URGENCY[a.urgency];
          return (
            <motion.div
              key={a.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1 }}
              className={`ford-card p-4 border-l-4 ${u.color}`}
            >
              <div className="flex items-start gap-2 mb-2">
                <AlertTriangle className={`w-4 h-4 ${u.text} mt-0.5`} />
                <div className="flex-1">
                  <div className="text-sm font-bold">{a.title}</div>
                  <div className={`text-[9px] uppercase tracking-wider mt-0.5 ${u.text}`}>
                    Urgência {u.label}
                  </div>
                </div>
              </div>
              <p className="text-[11px] text-white/70 leading-relaxed mb-3">
                {a.body}
              </p>
              <div className="flex items-center gap-3 text-[10px] text-white/60 mb-3">
                {a.daysToService && (
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    <span>~{a.daysToService} dias</span>
                  </div>
                )}
                {a.discount && (
                  <div className="flex items-center gap-1 text-ford-blue-light font-semibold">
                    <Tag className="w-3 h-3" />
                    <span>{a.discount}</span>
                  </div>
                )}
                <div className="flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  <span>{a.dealership}</span>
                </div>
              </div>
              <button className="cta-rimac w-full justify-center text-[9px] py-2">
                Agendar agora
                <ChevronRight className="w-3 h-3" />
              </button>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
