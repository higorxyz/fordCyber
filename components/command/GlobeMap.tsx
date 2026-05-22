"use client";

import { useEffect, useRef, useMemo, useCallback, useState } from "react";
import Globe, { GlobeMethods } from "react-globe.gl";
import { dealerships, Dealership } from "@/data/dealerships";

const LEVEL_COLORS: Record<string, string> = {
  high: "#00C853",
  mid: "#FFB300",
  low: "#FF3D00",
};

const LEVEL_GLOW: Record<string, string> = {
  high: "rgba(0, 200, 83, 0.35)",
  mid: "rgba(255, 179, 0, 0.35)",
  low: "rgba(255, 61, 0, 0.45)",
};

const LABEL_OFFSETS: Record<string, { x: number; y: number; align: "left" | "right" }> = {
  "ford-pacaembu":     { x: 85,  y: 30,   align: "left" },
  "ford-pioneira":     { x: -90, y: 10,   align: "right" },
  "ford-niteroi":      { x: 85,  y: -10,  align: "left" },
  "ford-minas":        { x: 80,  y: -35,  align: "left" },
  "ford-brasilia":     { x: -85, y: -20,  align: "right" },
  "ford-pantanal":     { x: -80, y: 14,   align: "right" },
  "ford-sulamericana": { x: -75, y: 16,   align: "right" },
  "ford-tropical":     { x: -85, y: -15,  align: "right" },
  "ford-sertao":       { x: 85,  y: -10,  align: "left" },
  "ford-marajo":       { x: 85,  y: 15,   align: "left" },
  "ford-buenos-aires": { x: 85,  y: 10,   align: "left" },
  "ford-cordoba":      { x: -85, y: -10,  align: "right" },
  "ford-santiago":     { x: -85, y: 15,   align: "right" },
  "ford-bogota":       { x: 85,  y: -15,  align: "left" },
  "ford-lima":         { x: -85, y: 10,   align: "right" },
  "ford-quito":        { x: -85, y: 15,   align: "right" },
  "ford-asuncion":     { x: -85, y: -10,  align: "right" },
  "ford-montevideo":   { x: 85,  y: -15,  align: "left" },
};

interface Props {
  selected: Dealership | null;
  onSelect: (d: Dealership | null) => void;
}

type HtmlMarker = {
  lat: number;
  lng: number;
  dealer: Dealership;
};

export default function GlobeMap({ selected, onSelect }: Props) {
  const globeRef = useRef<GlobeMethods | undefined>(undefined);
  const frameRef = useRef<number>(0);
  const pausedRef = useRef(false);
  const [dimensions, setDimensions] = useState({ w: 1200, h: 700 });

  useEffect(() => {
    const update = () => {
      const navEl = document.querySelector("nav");
      const navH = navEl ? navEl.getBoundingClientRect().height : 56;
      const headerEl = document.querySelector("[data-command-header]");
      const headerH = headerEl ? headerEl.getBoundingClientRect().height : 48;
      setDimensions({ w: window.innerWidth, h: window.innerHeight - navH - headerH });
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  const rings = useMemo(
    () =>
      dealerships.map((d) => ({
        lat: d.lat,
        lng: d.lng,
        maxR: d.level === "low" ? 3.5 : d.level === "mid" ? 2.5 : 2,
        propagationSpeed: d.level === "low" ? 3 : 1.5,
        repeatPeriod: d.level === "low" ? 900 : 1600,
        color: LEVEL_GLOW[d.level],
      })),
    []
  );

  const htmlMarkers = useMemo<HtmlMarker[]>(
    () => dealerships.map((d) => ({ lat: d.lat, lng: d.lng, dealer: d })),
    []
  );

  const handleMarkerClick = useCallback(
    (marker: HtmlMarker) => {
      if (!marker.dealer) return;
      onSelect(marker.dealer);
      pausedRef.current = true;
      globeRef.current?.pointOfView(
        { lat: marker.dealer.lat, lng: marker.dealer.lng, altitude: 1.0 },
        800
      );
      setTimeout(() => {
        pausedRef.current = false;
        globeRef.current?.pointOfView(
          { lat: -14, lng: -52, altitude: 1.6 },
          1500
        );
      }, 3500);
    },
    [onSelect]
  );

  useEffect(() => {
    const globe = globeRef.current;
    if (!globe) return;

    globe.pointOfView({ lat: -14, lng: -52, altitude: 1.6 }, 2000);

    const controls = globe.controls();
    if (controls) {
      controls.autoRotate = false;
      controls.enableZoom = true;
      controls.enableRotate = true;
      controls.enablePan = false;
      controls.minDistance = 120;
      controls.maxDistance = 500;
      controls.rotateSpeed = 0.5;
      controls.zoomSpeed = 0.8;
    }

    let t = 0;
    let userInteracting = false;
    let idleTimer: ReturnType<typeof setTimeout>;

    const renderer = globe.renderer();
    const dom = renderer.domElement;

    const onInteractStart = () => {
      userInteracting = true;
      pausedRef.current = true;
      clearTimeout(idleTimer);
    };
    const onInteractEnd = () => {
      userInteracting = false;
      idleTimer = setTimeout(() => {
        pausedRef.current = false;
      }, 4000);
    };

    dom.addEventListener("pointerdown", onInteractStart);
    dom.addEventListener("wheel", onInteractStart);
    dom.addEventListener("pointerup", onInteractEnd);

    const tick = () => {
      t++;
      if (!pausedRef.current && !userInteracting && globe) {
        const lng = -52 + Math.sin(t * 0.004) * 7;
        const lat = -14 + Math.sin(t * 0.002) * 1.5;
        globe.pointOfView({ lat, lng, altitude: 1.6 }, 0);
      }
      frameRef.current = requestAnimationFrame(tick);
    };

    const startTimer = setTimeout(() => {
      frameRef.current = requestAnimationFrame(tick);
    }, 2500);

    return () => {
      clearTimeout(startTimer);
      clearTimeout(idleTimer);
      cancelAnimationFrame(frameRef.current);
      dom.removeEventListener("pointerdown", onInteractStart);
      dom.removeEventListener("wheel", onInteractStart);
      dom.removeEventListener("pointerup", onInteractEnd);
    };
  }, []);

  const createMarkerElement = useCallback(
    (marker: HtmlMarker) => {
      const wrapper = document.createElement("div");
      wrapper.style.position = "relative";
      wrapper.style.width = "0";
      wrapper.style.height = "0";

      const dealer = marker.dealer;
      if (!dealer) return wrapper;

      const color = LEVEL_COLORS[dealer.level];
      const isSel = selected?.id === dealer.id;
      const dotSize = isSel ? 16 : 10;
      const cfg = LABEL_OFFSETS[dealer.id];
      const ox = cfg?.x ?? 0;
      const oy = cfg?.y ?? 0;
      const alignRight = cfg?.align === "right";
      const hasOffset = ox !== 0 || oy !== 0;

      const dot = document.createElement("div");
      dot.style.position = "absolute";
      dot.style.width = `${dotSize}px`;
      dot.style.height = `${dotSize}px`;
      dot.style.borderRadius = "50%";
      dot.style.background = color;
      dot.style.boxShadow = `0 0 ${isSel ? 20 : 10}px ${color},0 0 ${
        isSel ? 40 : 20
      }px ${color}55`;
      dot.style.border = isSel ? "2px solid white" : `1.5px solid ${color}`;
      dot.style.transform = "translate(-50%,-50%)";
      dot.style.transition = "all .3s";
      dot.style.zIndex = "2";
      wrapper.appendChild(dot);

      if (hasOffset) {
        const lineLen = Math.sqrt(ox * ox + oy * oy);
        const lineAngle = Math.atan2(oy, ox) * (180 / Math.PI);
        const line = document.createElement("div");
        line.style.position = "absolute";
        line.style.top = "0";
        line.style.left = "0";
        line.style.width = `${lineLen}px`;
        line.style.height = "1px";
        line.style.background = `linear-gradient(90deg,${color}66,${color}11)`;
        line.style.transformOrigin = "0 0";
        line.style.transform = `rotate(${lineAngle}deg)`;
        line.style.zIndex = "1";
        wrapper.appendChild(line);
      }

      const label = document.createElement("div");
      label.style.position = "absolute";
      label.style.left = `${ox}px`;
      label.style.top = `${oy}px`;
      label.style.transform = `translate(${alignRight ? "-100%" : "0"},-50%)`;
      label.style.display = "flex";
      label.style.flexDirection = "column";
      label.style.alignItems = alignRight ? "flex-end" : "flex-start";
      label.style.textAlign = alignRight ? "right" : "left";
      label.style.whiteSpace = "nowrap";
      label.style.zIndex = "3";

      const dealerName = document.createElement("div");
      dealerName.style.fontFamily = "'JetBrains Mono',monospace";
      dealerName.style.fontSize = `${isSel ? 11 : 9}px`;
      dealerName.style.fontWeight = isSel ? "700" : "600";
      dealerName.style.color = "white";
      dealerName.style.opacity = isSel ? "1" : "0.9";
      dealerName.style.textShadow = "0 0 6px #000,0 0 12px rgba(0,0,0,.8)";
      dealerName.style.letterSpacing = ".06em";
      dealerName.style.textTransform = "uppercase";
      dealerName.style.lineHeight = "1.2";
      dealerName.textContent = dealer.name.replace(/^Ford\s+/i, "");
      label.appendChild(dealerName);

      const vinShare = document.createElement("div");
      vinShare.style.fontFamily = "'JetBrains Mono',monospace";
      vinShare.style.fontSize = `${isSel ? 13 : 10}px`;
      vinShare.style.fontWeight = "700";
      vinShare.style.color = color;
      vinShare.style.textShadow = `0 0 8px ${color}66`;
      vinShare.style.letterSpacing = ".08em";
      vinShare.style.lineHeight = "1.3";
      vinShare.textContent = `${dealer.vinShare}%`;
      label.appendChild(vinShare);

      wrapper.appendChild(label);
      return wrapper;
    },
    [selected]
  );

  return (
    <div className="w-full h-full relative bg-black overflow-hidden">
      <Globe
        ref={globeRef}
        globeImageUrl="//unpkg.com/three-globe/example/img/earth-night.jpg"
        backgroundImageUrl="//unpkg.com/three-globe/example/img/night-sky.png"
        atmosphereColor="#0068D6"
        atmosphereAltitude={0.15}
        ringsData={rings}
        ringLat="lat"
        ringLng="lng"
        ringMaxRadius="maxR"
        ringPropagationSpeed="propagationSpeed"
        ringRepeatPeriod="repeatPeriod"
        ringColor="color"
        htmlElementsData={htmlMarkers}
        htmlLat="lat"
        htmlLng="lng"
        htmlAltitude={0.015}
        htmlElement={(data) => {
          const marker = data as HtmlMarker;
          const el = createMarkerElement(marker);
          el.style.pointerEvents = "auto";
          el.style.cursor = "pointer";
          el.onclick = () => handleMarkerClick(marker);
          return el;
        }}
        animateIn={true}
        width={dimensions.w}
        height={dimensions.h}
      />

      <div className="absolute top-14 sm:top-4 right-4 bg-black/85 border border-ford-blue/40 p-3 sm:p-4 z-10 font-mono-tech text-[10px] uppercase tracking-wider bracket max-w-[200px] backdrop-blur-sm">
        <div className="text-ford-blue-light mb-3 text-[11px] font-bold">REDE FORD BRASIL</div>
        <div className="space-y-2.5 text-white/70">
          <div className="flex items-center gap-2.5">
            <span className="w-3 h-3 rounded-full bg-green-400" style={{ boxShadow: "0 0 8px #00C853" }} />
            <span>SHARE &gt; 70%</span>
            <span className="ml-auto text-green-400 font-bold">{dealerships.filter(d => d.level === "high").length}</span>
          </div>
          <div className="flex items-center gap-2.5">
            <span className="w-3 h-3 rounded-full bg-yellow-400" style={{ boxShadow: "0 0 8px #FFB300" }} />
            <span>SHARE 40-70%</span>
            <span className="ml-auto text-yellow-400 font-bold">{dealerships.filter(d => d.level === "mid").length}</span>
          </div>
          <div className="flex items-center gap-2.5">
            <span className="w-3 h-3 rounded-full" style={{ background: "#FF3D00", boxShadow: "0 0 8px #FF3D00" }} />
            <span>SHARE &lt; 40%</span>
            <span className="ml-auto text-[#FF3D00] font-bold">{dealerships.filter(d => d.level === "low").length}</span>
          </div>
        </div>
        <div className="mt-3 pt-3 border-t border-white/10 text-white/40 text-[9px]">
          <div>{dealerships.length} CONCESSIONÁRIAS ATIVAS</div>
          <div className="mt-1 normal-case tracking-normal">Clique para detalhes</div>
        </div>
      </div>

      <div className="absolute bottom-4 left-2 right-2 sm:left-4 sm:right-4 flex justify-center z-10">
        <div className="bg-black/85 border border-ford-blue/30 px-3 sm:px-6 py-2 sm:py-3 font-mono-tech text-[9px] sm:text-[10px] uppercase tracking-wider flex items-center gap-3 sm:gap-6 backdrop-blur-sm flex-wrap justify-center">
          <div>
            <span className="text-white/40">CLIENTES </span>
            <span className="text-ford-blue-light font-bold text-sm">{dealerships.reduce((s, d) => s + d.activeClients, 0).toLocaleString("pt-BR")}</span>
          </div>
          <div className="w-px h-5 bg-white/15" />
          <div>
            <span className="text-white/40">LEADS </span>
            <span className="text-yellow-400 font-bold text-sm">{dealerships.reduce((s, d) => s + d.pendingLeads, 0)}</span>
          </div>
          <div className="w-px h-5 bg-white/15" />
          <div>
            <span className="text-white/40">SHARE </span>
            <span className="text-green-400 font-bold text-sm">{Math.round(dealerships.reduce((s, d) => s + d.vinShare, 0) / dealerships.length)}%</span>
          </div>
          <div className="w-px h-5 bg-white/15" />
          <div>
            <span className="text-white/40">RETORNO </span>
            <span className="text-white font-bold text-sm">{Math.round(dealerships.reduce((s, d) => s + d.returnRate, 0) / dealerships.length)}%</span>
          </div>
        </div>
      </div>
    </div>
  );
}
