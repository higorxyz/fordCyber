"use client";

import { motion } from "framer-motion";
import { Package, AlertTriangle, Globe, ArrowRight } from "lucide-react";

interface StockRow {
  part: string;
  forecast: number;
  available: number;
  dealership: string;
  source?: string;
}

const ROWS: StockRow[] = [
  {
    part: "Pastilha de freio Ranger",
    forecast: 15,
    available: 8,
    dealership: "Ford Pacaembu",
    source: "Ford Pioneira (Campinas) — 7 un.",
  },
  {
    part: "Filtro de óleo Territory",
    forecast: 22,
    available: 24,
    dealership: "Ford Niterói",
  },
  {
    part: "Correia dentada Maverick",
    forecast: 9,
    available: 2,
    dealership: "Ford Pantanal",
    source: "Ford Brasília — 6 un.",
  },
  {
    part: "Pneu 265/65 R17",
    forecast: 18,
    available: 0,
    dealership: "Ford Tropical",
    source: "Hub regional Manaus → 5 dias úteis",
  },
  {
    part: "Bateria 60Ah",
    forecast: 12,
    available: 14,
    dealership: "Ford Minas",
  },
  {
    part: "Filtro de ar premium",
    forecast: 30,
    available: 41,
    dealership: "Ford Sulamericana",
  },
];

export default function StockControl() {
  return (
    <div className="space-y-4">
      <div>
        <div className="label-tech mb-2">03 · LOGÍSTICA</div>
        <h2 className="font-display text-3xl font-bold tracking-[0.05em] uppercase">
          Estoque <span className="text-ford-blue-light">Integrado</span>
        </h2>
        <p className="font-mono-tech text-[10px] text-white/50 mt-1 uppercase tracking-wider">
          Demanda 30d × estoque · rastreamento global Ford
        </p>
      </div>

      <div className="ford-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-black/50 text-[10px] uppercase tracking-[0.2em] text-white/50">
            <tr>
              <th className="text-left p-3">Peça</th>
              <th className="text-left p-3">Concessionária</th>
              <th className="text-right p-3">Demanda 30d</th>
              <th className="text-right p-3">Estoque</th>
              <th className="text-left p-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {ROWS.map((r, i) => {
              const deficit = r.forecast - r.available;
              const critical = deficit > 0;
              const out = r.available === 0;
              return (
                <motion.tr
                  key={r.part}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.05 }}
                  className="border-t border-ford-gray-mid hover:bg-ford-blue/15"
                >
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <Package className="w-4 h-4 text-white/40" />
                      <div>
                        <div className="text-xs">{r.part}</div>
                        {r.source && (
                          <div className="text-[10px] text-ford-blue-light flex items-center gap-1 mt-0.5">
                            <Globe className="w-2.5 h-2.5" />
                            {r.source}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="p-3 text-xs text-white/70">{r.dealership}</td>
                  <td className="p-3 text-right num-display text-xs">
                    {r.forecast}
                  </td>
                  <td className="p-3 text-right num-display text-xs">
                    {r.available}
                  </td>
                  <td className="p-3">
                    {out ? (
                      <span className="inline-flex items-center gap-1 text-[9px] uppercase tracking-wider text-ford-red border border-ford-red/40 bg-ford-red/10 px-2 py-0.5 rounded">
                        <AlertTriangle className="w-3 h-3" /> Transferência
                      </span>
                    ) : critical ? (
                      <span className="inline-flex items-center gap-1 text-[9px] uppercase tracking-wider text-yellow-400 border border-yellow-400/40 bg-yellow-400/10 px-2 py-0.5 rounded">
                        <AlertTriangle className="w-3 h-3" /> Déficit {deficit}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[9px] uppercase tracking-wider text-green-400 border border-green-400/40 bg-green-400/10 px-2 py-0.5 rounded">
                        OK
                      </span>
                    )}
                  </td>
                </motion.tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="ford-card p-4 border-l-4 border-l-ford-red">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-ford-red mt-0.5" />
          <div className="flex-1">
            <div className="text-sm font-bold">
              Recomendação automática do Vision AI
            </div>
            <p className="text-xs text-white/70 mt-1 leading-relaxed">
              Modelo prevê <b>15 trocas de pastilha de freio</b> em 30 dias na
              Ford Pacaembu. Estoque atual: 8 kits.{" "}
              <span className="text-ford-red">
                Solicitar transferência de 7 unidades da Ford Pioneira
                (Campinas).
              </span>
            </p>
            <button className="mt-3 px-3 py-1.5 bg-ford-red hover:bg-ford-red-dark text-[10px] uppercase tracking-[0.2em] font-bold flex items-center gap-1">
              Aprovar transferência
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
