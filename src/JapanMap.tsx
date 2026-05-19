import React from "react";
import {
  ComposableMap,
  Geographies,
  Geography,
  Marker
} from "react-simple-maps";
import { motion } from "motion/react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

const geoUrl = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-50m.json";

function cn(...inputs) {
  return twMerge(clsx(inputs));
}

const STADIUMS = [
  { id: 'escon', name: 'エスコンフィールドHOKKAIDO', lat: 42.9904, lng: 141.5516 },
  { id: 'rakuten', name: '楽天モバイルパーク', lat: 38.2564, lng: 140.9026 },
  { id: 'marine', name: 'ZOZOマリンスタジアム', lat: 35.6450, lng: 140.0308 },
  { id: 'jingu', name: '明治神宮野球場', lat: 35.6744, lng: 139.7170 },
  { id: 'yokohama', name: '横浜スタジアム', lat: 35.4433, lng: 139.6400 },
  { id: 'koshien', name: '阪神甲子園球場', lat: 34.7212, lng: 135.3616 }
];

export const JapanMap = ({ selectedId, onSelect }) => {
  return (
    <div className="relative w-full aspect-[4/3] bg-[#0a0a0c]/80 backdrop-blur-md rounded-2xl border border-white/5 overflow-hidden flex items-center justify-center shadow-xl">
      {/* Background Grid */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#22d3ee08_1px,transparent_1px),linear-gradient(to_bottom,#22d3ee08_1px,transparent_1px)] bg-[size:10%_10%] pointer-events-none" />
       
      <div className="absolute top-4 left-4 flex items-center gap-2 z-30 bg-black/40 px-2 py-1 rounded border border-white/5 backdrop-blur-sm">
        <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-pulse" />
        <span className="text-[9px] text-cyan-400 font-mono tracking-widest uppercase">GEO-LOCK SCANNER</span>
      </div>

      <ComposableMap
        projection="geoMercator"
        projectionConfig={{
          scale: 1800,
          center: [137.5, 38.5]
        }}
        style={{ width: "100%", height: "100%" }}
      >
        <Geographies geography={geoUrl}>
          {({ geographies }) =>
            geographies
              .filter(geo => geo.properties.name === "Japan")
              .map(geo => (
                <Geography
                  key={geo.rsmKey}
                  geography={geo}
                  fill="transparent"
                  stroke="#0891b2"
                  strokeWidth={0.5}
                  style={{
                    default: { outline: "none", filter: "drop-shadow(0 0 10px rgba(34,211,238,0.3))" },
                    hover: { outline: "none" },
                    pressed: { outline: "none" },
                  }}
                />
              ))
          }
        </Geographies>

        {STADIUMS.map((s) => {
          const isSelected = selectedId === s.id;
          return (
            <Marker key={s.id} coordinates={[s.lng, s.lat]} onClick={() => onSelect(s.id)}>
              <circle
                r={isSelected ? 4 : 2}
                fill={isSelected ? "#22d3ee" : "#064e3b"}
                stroke="#22d3ee"
                strokeWidth={1}
                className={cn(
                  "cursor-pointer transition-all duration-300",
                  isSelected ? "animate-pulse" : "hover:fill-[#22d3ee]"
                )}
              />
              {isSelected && (
                <g transform="translate(6, 0)">
                  <line x1="0" y1="0" x2="10" y2="0" stroke="rgba(34,211,238,0.5)" strokeWidth={1} />
                  <text
                    x="12"
                    y="3"
                    textAnchor="start"
                    style={{
                      fontFamily: "monospace",
                      fontSize: "6px",
                      fill: "#67e8f9",
                      textShadow: "0 0 4px rgba(34,211,238,1)",
                      fontWeight: "bold",
                      letterSpacing: "1px"
                    }}
                  >
                    {s.id.toUpperCase()}
                  </text>
                </g>
              )}
            </Marker>
          );
        })}
      </ComposableMap>
    </div>
  );
};
