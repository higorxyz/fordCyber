"use client";

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import {
  Phone,
  MessageCircle,
  Filter,
  Package,
  AlertTriangle,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { leads, Lead, StockStatus } from "@/data/leads";

const STOCK_LABEL: Record<
  StockStatus,
  { icon: LucideIcon; color: string; label: string }
> = {
  ok: { icon: CheckCircle2, color: "text-green-400", label: "Disponível" },
  partial: { icon: AlertTriangle, color: "text-yellow-400", label: "Parcial" },
  out: { icon: XCircle, color: "text-ford-red", label: "Indisponível" },
};

export default function LeadsRadar() {
  const [region, setRegion] = useState<string>("all");
  const [urgency, setUrgency] = useState<string>("all");
  const [openLead, setOpenLead] = useState<Lead | null>(null);

  const filtered = useMemo(() => {
    return leads
      .filter((l) => region === "all" || l.region === region)
      .filter((l) => urgency === "all" || l.urgency === urgency)
      .sort((a, b) => b.probability - a.probability);
  }, [region, urgency]);

  const regions = ["all", ...Array.from(new Set(leads.map((l) => l.region)))];

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="label-tech mb-2">02 · OPERAÇÕES</div>
          <h2 className="font-display text-3xl font-bold tracking-[0.05em] uppercase">
            Radar de <span className="text-ford-blue-light">Leads</span>
          </h2>
          <p className="font-mono-tech text-[10px] text-white/50 mt-1 uppercase tracking-wider">
            Fila rankeada · ML · gerada às 06:00
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap shrink-0">
          <Filter className="w-3.5 h-3.5 text-white/40" />
          <select
            value={region}
            onChange={(e) => setRegion(e.target.value)}
            className="bg-ford-gray border border-ford-gray-mid text-xs px-3 py-1.5 focus:border-ford-blue-light focus:outline-none"
          >
            {regions.map((r) => (
              <option key={r} value={r}>
                {r === "all" ? "Todas regiões" : r}
              </option>
            ))}
          </select>
          <select
            value={urgency}
            onChange={(e) => setUrgency(e.target.value)}
            className="bg-ford-gray border border-ford-gray-mid text-xs px-3 py-1.5 focus:border-ford-blue-light focus:outline-none"
          >
            <option value="all">Todas urgências</option>
            <option value="high">Alta</option>
            <option value="mid">Média</option>
            <option value="low">Baixa</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {filtered.map((l, i) => {
          const Stock = STOCK_LABEL[l.stock];
          const SIcon = Stock.icon;
          const Channel = l.channel === "whatsapp" ? MessageCircle : Phone;
          return (
            <motion.div
              key={l.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="ford-card bracket p-4 cursor-pointer"
              onClick={() => setOpenLead(l)}
            >
              <div className="flex items-start justify-between mb-2">
                <div>
                  <div className="font-mono-tech text-[9px] text-ford-blue-light">
                    LEAD
                    {l.id}
                  </div>
                  <div className="font-display font-bold text-base mt-0.5">{l.customer}</div>
                  <div className="font-mono-tech text-[10px] text-white/60 mt-0.5">
                    {l.vehicle} · {l.km.toLocaleString("pt-BR")} km
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Channel
                    className={`w-4 h-4 ${
                      l.channel === "whatsapp"
                        ? "text-green-400"
                        : "text-ford-blue-light"
                    }`}
                  />
                </div>
              </div>

              <div className="mb-2">
                <div className="flex items-center justify-between text-[10px] uppercase tracking-wider text-white/50 mb-1">
                  <span>Probabilidade ML</span>
                  <span className="num-display text-ford-blue-light">
                    {l.probability}%
                  </span>
                </div>
                <div className="h-1.5 bg-ford-gray-mid rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-ford-blue to-ford-blue-light"
                    style={{
                      width: `${l.probability}%`,
                      boxShadow: "0 0 8px rgba(0,104,214,0.6)",
                    }}
                  />
                </div>
              </div>

              <div className="text-[11px] text-white/80 mb-2">{l.service}</div>

              <div className="flex items-center justify-between text-[10px]">
                <div className="flex items-center gap-1 text-white/50">
                  <Package className="w-3 h-3" />
                  <span>{l.dealership}</span>
                </div>
                <div className={`flex items-center gap-1 ${Stock.color}`}>
                  <SIcon className="w-3 h-3" />
                  <span className="uppercase tracking-wider font-semibold">
                    {Stock.label}
                  </span>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {openLead && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setOpenLead(null)}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            onClick={(e) => e.stopPropagation()}
            className="ford-card max-w-lg w-full p-6"
          >
            <div className="font-mono-tech text-[10px] uppercase tracking-[0.3em] text-ford-blue-light">
              LEAD ·
              {openLead.id}
            </div>
            <h3 className="font-display text-3xl font-bold mt-1 uppercase tracking-wide">{openLead.customer}</h3>
            <p className="text-sm text-white/60 mt-1">
              {openLead.vehicle} · {openLead.km.toLocaleString("pt-BR")} km
            </p>
            <div className="mt-4 p-3 bg-black border-l-2 border-ford-blue-light">
              <div className="text-[9px] uppercase tracking-wider text-white/50 mb-1">
                Serviço previsto
              </div>
              <div className="text-sm">{openLead.service}</div>
              <div className="text-[10px] text-white/40 mt-1">
                Peças: {openLead.parts.join(", ")}
              </div>
            </div>
            <div className="mt-3 p-3 bg-black border-l-2 border-ford-blue-light">
              <div className="text-[9px] uppercase tracking-wider text-white/50 mb-1">
                Script sugerido
              </div>
              <p className="text-xs italic text-white/80 leading-relaxed">
                &quot;{openLead.script}&quot;
              </p>
            </div>
            <div className="flex gap-2 mt-5">
              <button className="flex-1 py-2.5 bg-ford-blue hover:bg-ford-blue-light border border-ford-blue-light text-xs uppercase tracking-[0.2em] font-bold flex items-center justify-center gap-2">
                {openLead.channel === "whatsapp" ? (
                  <MessageCircle className="w-4 h-4" />
                ) : (
                  <Phone className="w-4 h-4" />
                )}
                Contatar agora
              </button>
              <button
                onClick={() => setOpenLead(null)}
                className="cta-rimac text-[9px] px-4"
              >
                Fechar
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
