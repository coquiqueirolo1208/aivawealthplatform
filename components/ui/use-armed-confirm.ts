"use client";

import { useRef, useState } from "react";

const ARM_DELAY_MS = 500;

/**
 * Two-step delete confirmation. The "¿Confirmar?" button renders in the same spot
 * as the "Borrar" button, so without a delay the second click of a double-click
 * lands on it and hard-deletes. `ready()` ignores clicks within ARM_DELAY_MS of arming.
 */
export function useArmedConfirm<T = string>() {
  const [armed, setArmed] = useState<T | null>(null);
  const armedAt = useRef(0);
  return {
    armed,
    arm(id: T) {
      armedAt.current = Date.now();
      setArmed(id);
    },
    disarm() {
      setArmed(null);
    },
    ready() {
      return Date.now() - armedAt.current >= ARM_DELAY_MS;
    },
  };
}
