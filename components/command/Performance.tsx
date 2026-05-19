"use client";

import { motion } from "framer-motion";
import { Trophy, ArrowUp, ArrowDown, Minus } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { dealerships } from "@/data/dealerships";

const ranking = [...dealerships]
  .sort((a, b) => b.vinShare - a.vinShare)
  .map((d, i) => ({
    ...d,
    rank: i + 1,
    delta: i % 3 === 0 ? "up" : i % 3 === 1 ? "down" : "flat",
  }));

const chartData = ranking.slice(0, 8).map((d) => ({
  name: d.name.replace("Ford ", ""),
  share: d.vinShare,
}));

export default function Performance() {
  return (
    <div className="space-y-4">
      <div>
        <div className="label-tech mb-2">04 · PERFORMANCE</div>
        <h2 className="font-display text-3xl font-bold tracking-[0.05em] uppercase">
          Painel <span className="text-ford-blue-light">Tático</span>
        </h2>
        <p className="font-mono-tech text-[10px] text-white/50 mt-1 uppercase tracking-wider">
          Ranking · gamificação · concessionárias
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 ford-card p-4">
          <div className="text-[10px] uppercase tracking-[0.25em] text-white/50 mb-3">
            VIN Share por concessionária
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} layout="vertical">
                <CartesianGrid stroke="#2D2D2D" strokeDasharray="3 3" />
                <XAxis
                  type="number"
                  stroke="#666"
                  fontSize={10}
                  domain={[0, 100]}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  stroke="#999"
                  fontSize={11}
                  width={100}
                />
                <Tooltip
                  contentStyle={{
                    background: "#000",
                    border: "1px solid #0068D6",
                    fontSize: 11,
                  }}
                />
                <Bar
                  dataKey="share"
                  fill="#0068D6"
                  radius={[0, 4, 4, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="ford-card p-4">
          <div className="flex items-center gap-2 mb-3">
            <Trophy className="w-4 h-4 text-yellow-400" />
            <div className="text-[10px] uppercase tracking-[0.25em] text-white/50">
              Leaderboard
            </div>
          </div>
          <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
            {ranking.map((d) => {
              const Icon =
                d.delta === "up" ? ArrowUp : d.delta === "down" ? ArrowDown : Minus;
              const color =
                d.delta === "up"
                  ? "text-green-400"
                  : d.delta === "down"
                  ? "text-ford-red"
                  : "text-white/40";
              return (
                <motion.div
                  key={d.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: d.rank * 0.04 }}
                  className="flex items-center gap-3 p-2 rounded bg-black/40 hover:bg-ford-blue/20"
                >
                  <div
                    className={`w-7 h-7 flex items-center justify-center text-xs font-black rounded ${
                      d.rank === 1
                        ? "bg-yellow-400 text-black"
                        : d.rank === 2
                        ? "bg-white/80 text-black"
                        : d.rank === 3
                        ? "bg-orange-500 text-black"
                        : "bg-ford-gray-mid text-white/60"
                    }`}
                  >
                    {d.rank}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold truncate">
                      {d.name}
                    </div>
                    <div className="text-[9px] text-white/40">
                      {d.city}, {d.state}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="num-display text-xs text-ford-blue-light">
                      {d.vinShare}%
                    </div>
                    <Icon className={`w-3 h-3 ml-auto ${color}`} />
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Badge
          title="Maior conversão"
          dealer="Ford Pacaembu"
          value="73 leads"
          accent
        />
        <Badge
          title="Maior alta no Service Share"
          dealer="Ford Niterói"
          value="+8% este mês"
        />
        <Badge
          title="Melhor taxa de retorno"
          dealer="Ford Pacaembu"
          value="81%"
        />
      </div>
    </div>
  );
}

function Badge({
  title,
  dealer,
  value,
  accent,
}: {
  title: string;
  dealer: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div
      className={`ford-card p-4 ${
        accent ? "border-l-4 border-l-ford-blue-light" : ""
      }`}
    >
      <div className="text-[9px] uppercase tracking-[0.25em] text-white/50">
        {title}
      </div>
      <div className="text-sm font-bold mt-1">{dealer}</div>
      <div className="num-display text-xl text-ford-blue-light mt-1">{value}</div>
    </div>
  );
}
