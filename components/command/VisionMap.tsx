"use client";

import { useEffect } from "react";
import { MapContainer, TileLayer, CircleMarker, Tooltip } from "react-leaflet";
import L from "leaflet";
import { dealerships, Dealership } from "@/data/dealerships";

const COLORS: Record<Dealership["level"], string> = {
  high: "#22c55e",
  mid: "#facc15",
  low: "#C41E3A",
};

const LATAM_BOUNDS: L.LatLngBoundsExpression = [
  [-56, -120],
  [33, -30],
];

interface Props {
  selected: Dealership | null;
  onSelect: (d: Dealership) => void;
}

export default function VisionMap({ selected, onSelect }: Props) {
  useEffect(() => {
    delete (L.Icon.Default.prototype as any)._getIconUrl;
  }, []);

  return (
    <MapContainer
      center={[-14.5, -51]}
      zoom={4}
      minZoom={3}
      maxZoom={8}
      maxBounds={LATAM_BOUNDS}
      maxBoundsViscosity={1.0}
      style={{ height: "100%", width: "100%" }}
      scrollWheelZoom
      attributionControl
      worldCopyJump={false}
    >
      <TileLayer
        attribution='&copy; OpenStreetMap'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {dealerships.map((d) => {
        const isSel = selected?.id === d.id;
        return (
          <CircleMarker
            key={d.id}
            center={[d.lat, d.lng]}
            radius={isSel ? 14 : 9}
            pathOptions={{
              color: COLORS[d.level],
              fillColor: COLORS[d.level],
              fillOpacity: 0.7,
              weight: isSel ? 4 : 2,
            }}
            eventHandlers={{
              click: () => onSelect(d),
            }}
            className="map-dot-pulse"
          >
            <Tooltip
              direction="top"
              offset={[0, -8]}
              opacity={1}
              className="!bg-black !text-white !border !border-ford-blue-light !rounded-none !text-[10px]"
            >
              <strong>{d.name}</strong>
              <br />
              VIN Share {d.vinShare}%
            </Tooltip>
          </CircleMarker>
        );
      })}
    </MapContainer>
  );
}
