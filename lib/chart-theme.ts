"use client";

import { useEffect, useState } from "react";

export interface ChartTheme {
  grid: string;
  tick: string;
  legend: string;
  panelBg: string;
  tooltipBg: string;
  tooltipText: string;
  accent: string;
  font: string;
}

const FALLBACK: ChartTheme = {
  grid: "#dee3ea",
  tick: "#7c8da6",
  legend: "#4a5a78",
  panelBg: "#ffffff",
  tooltipBg: "#f1f4f8",
  tooltipText: "#1b2a47",
  accent: "#28466f",
  font: "Inter, sans-serif",
};

function readTheme(): ChartTheme {
  if (typeof window === "undefined") return FALLBACK;
  const s = getComputedStyle(document.documentElement);
  const v = (name: string, fallback: string) => s.getPropertyValue(name).trim() || fallback;
  return {
    grid: v("--line", FALLBACK.grid),
    tick: v("--muted", FALLBACK.tick),
    legend: v("--paper-dim", FALLBACK.legend),
    panelBg: v("--panel", FALLBACK.panelBg),
    tooltipBg: v("--panel-2", FALLBACK.tooltipBg),
    tooltipText: v("--paper", FALLBACK.tooltipText),
    accent: v("--brass", FALLBACK.accent),
    font: "Inter, sans-serif",
  };
}

/**
 * Chart.js renders to canvas, so it can't inherit CSS custom properties the way
 * the rest of the page does — chart chrome (gridlines, ticks, legend, tooltip)
 * needs actual resolved colors, re-read whenever the light/dark toggle flips
 * `data-theme` on <html> (a plain DOM mutation, not React state).
 */
export function useChartTheme(): ChartTheme {
  const [theme, setTheme] = useState<ChartTheme>(FALLBACK);

  useEffect(() => {
    // One-time hydration from the DOM's resolved CSS custom properties, unavailable
    // during SSR — then re-synced whenever the theme toggle mutates data-theme.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTheme(readTheme());
    const observer = new MutationObserver(() => setTheme(readTheme()));
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => observer.disconnect();
  }, []);

  return theme;
}

/** Shared Chart.js `options` fragments (grid/ticks/legend/tooltip) built from the resolved theme. */
export function chartChrome(theme: ChartTheme) {
  return {
    legendLabels: { color: theme.legend, font: { family: theme.font, size: 11.5 }, boxWidth: 10 },
    tooltip: {
      backgroundColor: theme.tooltipBg,
      titleColor: theme.tooltipText,
      bodyColor: theme.tooltipText,
      borderColor: theme.grid,
      borderWidth: 1,
      padding: 10,
      titleFont: { family: theme.font, size: 12, weight: 600 as const },
      bodyFont: { family: theme.font, size: 12 },
      boxPadding: 4,
    },
    scaleGrid: { color: theme.grid, drawTicks: false },
    scaleTicks: { color: theme.tick, font: { family: theme.font, size: 11 } },
  };
}
