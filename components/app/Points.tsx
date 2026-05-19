"use client";

import { motion } from "framer-motion";
import { Award, Gift, TrendingUp } from "lucide-react";
import { client } from "@/data/client";

export default function Points() {
  const p = client.points;
  const pct = Math.min(100, Math.round((p.balance / p.nextReward) * 100));
  return (
    <div className="px-5 py-5 space-y-5">
      <div>
        <h1 className="font-display text-3xl font-bold tracking-[0.05em] uppercase">
          Pontos <span className="text-ford-blue-light">Vision</span>
        </h1>
        <p className="text-[11px] text-white/50 mt-1">
          Cada serviço Ford = pontos pra você
        </p>
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="rounded-2xl p-5 relative overflow-hidden"
        style={{
          background:
            "linear-gradient(135deg, #003478 0%, #0068D6 70%, #001a3d 130%)",
        }}
      >
        <div className="absolute -right-8 -top-8 w-32 h-32 rounded-full bg-white/5" />
        <div className="absolute -right-4 bottom-2 w-20 h-20 rounded-full bg-white/5" />
        <div className="relative">
          <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.25em] text-white/70">
            <Award className="w-3 h-3" />
            Saldo
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-display text-5xl font-bold tabular-nums">
              {p.balance.toLocaleString("pt-BR")}
            </span>
            <span className="font-mono-tech text-[10px] text-white/70 uppercase tracking-wider">pts</span>
          </div>
          <div className="text-xs text-white/80 mt-1">
            ≈ R$ {p.money.toLocaleString("pt-BR")}
          </div>
        </div>
      </motion.div>

      <div className="ford-card p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="text-xs font-bold">Próxima recompensa</div>
          <div className="text-[10px] text-white/50">
            {p.balance}/{p.nextReward}
          </div>
        </div>
        <div className="h-2 bg-ford-gray-mid rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 1, ease: "easeOut" }}
            className="h-full bg-gradient-to-r from-ford-blue to-ford-blue-light"
            style={{ boxShadow: "0 0 10px rgba(0,104,214,0.6)" }}
          />
        </div>
        <div className="text-[10px] text-white/50 mt-2">
          Faltam {(p.nextReward - p.balance).toLocaleString("pt-BR")} pts pra
          desbloquear R$50 em peças
        </div>
      </div>

      <div className="space-y-2">
        <div className="text-[10px] uppercase tracking-[0.25em] text-white/50">
          Como usar
        </div>
        {[
          {
            i: <Gift className="w-4 h-4" />,
            t: "Acessórios Ford",
            d: "Tapetes, capas, organizadores",
          },
          {
            i: <TrendingUp className="w-4 h-4" />,
            t: "Desconto em peças",
            d: "Filtros, óleo, freios",
          },
          {
            i: <Award className="w-4 h-4" />,
            t: "Abatimento no próximo Ford",
            d: "Até R$3.000 na troca",
          },
        ].map((x) => (
          <div key={x.t} className="ford-card p-3 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-ford-blue/30 border border-ford-blue-light/50 flex items-center justify-center text-ford-blue-light">
              {x.i}
            </div>
            <div className="flex-1">
              <div className="text-xs font-bold">{x.t}</div>
              <div className="text-[10px] text-white/50">{x.d}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
