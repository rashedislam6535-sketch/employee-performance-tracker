"use client";

import React, { useEffect, useRef, useState } from "react";

function useWidth<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    setWidth(el.clientWidth);
    const ro = new ResizeObserver((entries) => {
      for (const e of entries) setWidth(e.contentRect.width);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, width] as const;
}

function niceMax(v: number): number {
  if (v <= 0) return 4;
  const pow = Math.pow(10, Math.floor(Math.log10(v)));
  const n = v / pow;
  const step = n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10;
  return step * pow;
}

const axisText = "fill-zinc-400 dark:fill-zinc-500";
const gridLine = "stroke-zinc-200 dark:stroke-zinc-800";

/* ---------------- Line chart ---------------- */

export function LineChart({
  points,
  labels,
  height = 160,
  color = "#4f46e5",
  labelEvery = 2,
  unit = "",
}: {
  points: number[];
  labels: string[];
  height?: number;
  color?: string;
  labelEvery?: number;
  unit?: string;
}) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const padL = 32;
  const padR = 8;
  const padT = 8;
  const padB = 22;
  const n = points.length;
  const max = niceMax(Math.max(...points, 0));
  const innerW = Math.max(0, width - padL - padR);
  const innerH = height - padT - padB;

  const x = (i: number) => padL + (n <= 1 ? innerW / 2 : (i * innerW) / (n - 1));
  const y = (v: number) => padT + innerH - (v / max) * innerH;

  const path = points.map((v, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  const area = n > 1 ? `${path} L${x(n - 1).toFixed(1)},${(padT + innerH).toFixed(1)} L${x(0).toFixed(1)},${(padT + innerH).toFixed(1)} Z` : "";

  return (
    <div ref={ref} className="w-full">
      {width > 0 && (
        <svg width={width} height={height} className="block overflow-visible">
          {[0, 0.5, 1].map((f) => (
            <g key={f}>
              <line x1={padL} x2={width - padR} y1={y(max * f)} y2={y(max * f)} className={gridLine} strokeWidth={1} />
              <text x={padL - 8} y={y(max * f) + 3} textAnchor="end" fontSize={10} className={axisText}>
                {Math.round(max * f)}
              </text>
            </g>
          ))}
          {area && <path d={area} fill={color} fillOpacity={0.07} />}
          <path d={path} fill="none" stroke={color} strokeWidth={1.75} strokeLinejoin="round" strokeLinecap="round" />
          {points.map((v, i) => (
            <g key={i}>
              <circle cx={x(i)} cy={y(v)} r={i === n - 1 ? 3.5 : 2.5} fill={color} className="stroke-white dark:stroke-zinc-900" strokeWidth={1.5}>
                <title>{`${labels[i]}: ${v}${unit}`}</title>
              </circle>
            </g>
          ))}
          {labels.map((l, i) =>
            i % labelEvery === 0 || i === n - 1 ? (
              <text key={i} x={x(i)} y={height - 6} textAnchor={i === 0 ? "start" : i === n - 1 ? "end" : "middle"} fontSize={10} className={axisText}>
                {l}
              </text>
            ) : null
          )}
        </svg>
      )}
    </div>
  );
}

/* ---------------- Grouped bar chart ---------------- */

export function BarChart({
  data,
  series,
  colors,
  height = 180,
}: {
  data: { label: string; values: number[] }[];
  series: string[];
  colors: string[];
  height?: number;
}) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const padL = 32;
  const padR = 8;
  const padT = 8;
  const padB = 22;
  const innerW = Math.max(0, width - padL - padR);
  const innerH = height - padT - padB;
  const max = niceMax(Math.max(0, ...data.flatMap((d) => d.values)));
  const groupW = data.length ? innerW / data.length : 0;
  const barW = Math.max(2, Math.min(14, (groupW * 0.7) / Math.max(1, series.length)));
  const groupInner = barW * series.length + 2 * (series.length - 1);
  const y = (v: number) => padT + innerH - (v / max) * innerH;

  return (
    <div className="w-full">
      <div ref={ref} className="w-full">
        {width > 0 && (
          <svg width={width} height={height} className="block overflow-visible">
            {[0, 0.5, 1].map((f) => (
              <g key={f}>
                <line x1={padL} x2={width - padR} y1={y(max * f)} y2={y(max * f)} className={gridLine} strokeWidth={1} />
                <text x={padL - 8} y={y(max * f) + 3} textAnchor="end" fontSize={10} className={axisText}>
                  {Math.round(max * f)}
                </text>
              </g>
            ))}
            {data.map((d, gi) => {
              const gx = padL + gi * groupW + (groupW - groupInner) / 2;
              return (
                <g key={gi}>
                  {d.values.map((v, si) => {
                    const bx = gx + si * (barW + 2);
                    const h = Math.max(0, (v / max) * innerH);
                    return (
                      <rect key={si} x={bx} y={y(v)} width={barW} height={h} rx={2} fill={colors[si % colors.length]}>
                        <title>{`${d.label} · ${series[si]}: ${v}`}</title>
                      </rect>
                    );
                  })}
                  <text x={padL + gi * groupW + groupW / 2} y={height - 6} textAnchor="middle" fontSize={10} className={axisText}>
                    {d.label}
                  </text>
                </g>
              );
            })}
          </svg>
        )}
      </div>
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
        {series.map((s, i) => (
          <span key={s} className="inline-flex items-center gap-1.5 text-[11px] text-zinc-500 dark:text-zinc-400">
            <span className="h-2 w-2 rounded-sm" style={{ background: colors[i % colors.length] }} />
            {s}
          </span>
        ))}
      </div>
    </div>
  );
}

/* ---------------- Donut chart ---------------- */

export function DonutChart({
  data,
  size = 132,
  thickness = 16,
}: {
  data: { label: string; value: number; color: string }[];
  size?: number;
  thickness?: number;
}) {
  const total = data.reduce((a, b) => a + b.value, 0);
  const r = (size - thickness) / 2;
  const c = 2 * Math.PI * r;
  let offset = 0;

  return (
    <div className="flex items-center gap-5">
      <svg width={size} height={size} className="shrink-0 -rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={thickness} className="stroke-zinc-100 dark:stroke-zinc-800" />
        {total > 0 &&
          data.map((d, i) => {
            const len = (d.value / total) * c;
            const el = (
              <circle
                key={i}
                cx={size / 2}
                cy={size / 2}
                r={r}
                fill="none"
                stroke={d.color}
                strokeWidth={thickness}
                strokeDasharray={`${len} ${c - len}`}
                strokeDashoffset={-offset}
              >
                <title>{`${d.label}: ${d.value}`}</title>
              </circle>
            );
            offset += len;
            return el;
          })}
      </svg>
      <ul className="min-w-0 flex-1 space-y-1.5">
        {data.length === 0 && <li className="text-xs text-zinc-500">No entries in the last 30 days.</li>}
        {data.map((d) => (
          <li key={d.label} className="flex items-center gap-2 text-xs">
            <span className="h-2 w-2 shrink-0 rounded-sm" style={{ background: d.color }} />
            <span className="truncate text-zinc-700 dark:text-zinc-300">{d.label}</span>
            <span className="ml-auto tabular-nums text-zinc-500">
              {d.value}
              <span className="ml-1.5 text-zinc-400">{total ? Math.round((d.value / total) * 100) : 0}%</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
