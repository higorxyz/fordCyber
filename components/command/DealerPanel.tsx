"use client";

import { motion } from "framer-motion";
import { X, MapPin, Users, Inbox, TrendingUp, Package } from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { Dealership } from "@/data/dealerships";

interface Props {
  dealer: Dealership;
  onClose: () => void;
}

const STATUS_COLOR = {
  ok: "text-green-400 border-green-400/40 bg-green-400/10",
  low: "text-yellow-400 border-yellow-400/40 bg-yellow-400/10",
  out: "text-ford-red border-ford-red/40 bg-ford-red/10",
};

const STATUS_LABEL = {
  ok: "OK",
  low: "BAIXO",
  out: "ZERADO",
};

export default function DealerPanel({ dealer, onClose }: Props) {
  return (
    <motion.aside
      initial={{ x: 420, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 420, opacity: 0 }}
      transition={{ type: "spring", damping: 25, stiffness: 220 }}
      className="absolute top-0 right-0 h-full w-[400px] xl:w-[420px] bg-[#0a0a0a] border-l border-ford-blue z-[1000] overflow-y-auto"
    >
      <div className="sticky top-0 bg-black/95 backdrop-blur border-b border-ford-blue/50 p-4 flex items-start justify-between z-10">
        <div>
          <div className="font-mono-tech text-[10px] uppercase tracking-[0.25em] text-ford-blue-light">
            CONCESSIONÁRIA ·
            {dealer.id.toUpperCase().split("-")[1]}
          </div>
          <h2 className="font-display text-xl font-bold mt-1 uppercase tracking-wide">{dealer.name}</h2>
          <div className="font-mono-tech flex items-center gap-1 text-[10px] text-white/60 mt-1">
            <MapPin className="w-3 h-3" />
            {dealer.city}, {dealer.state}
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1 text-white/60 hover:text-ford-blue-light"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="p-4 space-y-5">
        <div className="grid grid-cols-2 gap-3">
          <Kpi
            icon={<TrendingUp className="w-3 h-3" />}
            label="VIN Share"
            value={`${dealer.vinShare}%`}
          />
          <Kpi
            icon={<Users className="w-3 h-3" />}
            label="Clientes ativos"
            value={dealer.activeClients.toLocaleString("pt-BR")}
          />
          <Kpi
            icon={<Inbox className="w-3 h-3" />}
            label="Leads pendentes"
            value={dealer.pendingLeads.toString()}
          />
          <Kpi
            icon={<TrendingUp className="w-3 h-3" />}
            label="Taxa de retorno"
            value={`${dealer.returnRate}%`}
          />
        </div>

        <div>
          <div className="text-[10px] uppercase tracking-[0.25em] text-white/50 mb-2">
            Service Share · 6 meses
          </div>
          <div className="ford-card p-3 h-32">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={dealer.history}>
                <XAxis
                  dataKey="month"
                  stroke="#666"
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis hide domain={[0, 100]} />
                <Tooltip
                  contentStyle={{
                    background: "#000",
                    border: "1px solid #0068D6",
                    fontSize: 11,
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="share"
                  stroke="#0068D6"
                  strokeWidth={2.5}
                  dot={{ fill: "#0068D6", r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div>
          <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.25em] text-white/50 mb-2">
            <Package className="w-3 h-3" /> Estoque da filial
          </div>
          <div className="space-y-2">
            {dealer.criticalStock.map((s) => (
              <div
                key={s.part}
                className="flex items-center justify-between ford-card px-3 py-2"
              >
                <div>
                  <div className="text-xs">{s.part}</div>
                  <div className="text-[9px] text-white/40">{s.qty} un.</div>
                </div>
                <span
                  className={`text-[9px] uppercase tracking-wider px-2 py-0.5 border rounded ${STATUS_COLOR[s.status]}`}
                >
                  {STATUS_LABEL[s.status]}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </motion.aside>
  );
}

function Kpi({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="ford-card p-3">
      <div className="font-mono-tech flex items-center gap-1 text-[9px] uppercase tracking-wider text-white/50">
        {icon}
        {label}
      </div>
      <div className="num-display text-2xl mt-1">{value}</div>
    </div>
  );
}
