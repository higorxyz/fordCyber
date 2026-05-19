export type StockStatus = "ok" | "partial" | "out";

export interface Lead {
  id: string;
  customer: string;
  vehicle: string;
  km: number;
  probability: number;
  service: string;
  parts: string[];
  stock: StockStatus;
  channel: "whatsapp" | "phone";
  region: string;
  urgency: "low" | "mid" | "high";
  script: string;
  dealership: string;
}

export const leads: Lead[] = [
  {
    id: "L001",
    customer: "Carlos Oliveira",
    vehicle: "Ford Ranger 2023",
    km: 32100,
    probability: 89,
    service: "Troca de pastilha de freio",
    parts: ["Kit pastilha dianteira", "Sensor de desgaste"],
    stock: "ok",
    channel: "whatsapp",
    region: "Sudeste",
    urgency: "high",
    script:
      "Olá Carlos! Pelo padrão de uso da sua Ranger, suas pastilhas estão próximas do limite. Temos peça pronta hoje na Ford Pacaembu com 10% off pra clientes Vision.",
    dealership: "Ford Pacaembu",
  },
  {
    id: "L002",
    customer: "Ana Costa",
    vehicle: "Ford Territory 2024",
    km: 15800,
    probability: 76,
    service: "Revisão 15.000 km",
    parts: ["Filtro de óleo", "Óleo 5W30", "Filtro de ar"],
    stock: "ok",
    channel: "whatsapp",
    region: "Sul",
    urgency: "mid",
    script:
      "Oi Ana! Sua Territory está chegando na revisão dos 15k. Já reservamos os itens e podemos agendar pra essa semana.",
    dealership: "Ford Sulamericana",
  },
  {
    id: "L003",
    customer: "Pedro Santos",
    vehicle: "Ford Maverick 2023",
    km: 41200,
    probability: 92,
    service: "Troca de correia dentada",
    parts: ["Correia dentada", "Tensor", "Bomba d'água"],
    stock: "partial",
    channel: "phone",
    region: "Centro-Oeste",
    urgency: "high",
    script:
      "Pedro, sua Maverick está no momento ideal pra troca preventiva da correia. Já temos 2 dos 3 itens — o terceiro chega em 48h.",
    dealership: "Ford Pantanal",
  },
  {
    id: "L004",
    customer: "Julia Ferreira",
    vehicle: "Ford Bronco Sport 2024",
    km: 8900,
    probability: 45,
    service: "Check-up sazonal",
    parts: ["Inspeção visual"],
    stock: "ok",
    channel: "whatsapp",
    region: "Sudeste",
    urgency: "low",
    script:
      "Julia, com a mudança de estação, oferecemos check-up cortesia pra clientes Vision. Quer agendar?",
    dealership: "Ford Minas",
  },
  {
    id: "L005",
    customer: "Marcos Lima",
    vehicle: "Ford Ranger 2022",
    km: 58300,
    probability: 85,
    service: "Troca de pneus",
    parts: ["4x Pneu 265/65 R17"],
    stock: "out",
    channel: "phone",
    region: "Norte",
    urgency: "high",
    script:
      "Marcos, seus pneus estão no limite. Estamos solicitando transferência da unidade de SP — chega em 5 dias úteis. Posso reservar?",
    dealership: "Ford Tropical",
  },
  {
    id: "L006",
    customer: "Camila Rocha",
    vehicle: "Ford Territory 2023",
    km: 27600,
    probability: 71,
    service: "Troca de filtro de ar",
    parts: ["Filtro de ar premium"],
    stock: "ok",
    channel: "whatsapp",
    region: "Nordeste",
    urgency: "mid",
    script:
      "Camila, com a poeira da região, recomendamos antecipar a troca do filtro de ar. Temos disponível agora.",
    dealership: "Ford Sertão",
  },
];
