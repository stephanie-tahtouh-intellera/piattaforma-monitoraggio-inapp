import type { Role } from "@/domain/model";

export const TOUR_KEY = "inapp.guida.v1";

export interface TourState {
  role: Role | null;
  step: number;
  mode: "closed" | "help" | "tour";
  autostart?: boolean;
}

export const CLOSED: TourState = { role: null, step: 0, mode: "closed" };

export function readTourState(): TourState {
  try {
    return { ...CLOSED, ...(JSON.parse(localStorage.getItem(TOUR_KEY) ?? "null") ?? {}) };
  } catch {
    return CLOSED;
  }
}

/** Avvia la guida alla prossima pagina caricata (usato dal login e dalla pagina /guida). */
export function requestTourStart(): void {
  localStorage.setItem(TOUR_KEY, JSON.stringify({ ...CLOSED, autostart: true }));
}
