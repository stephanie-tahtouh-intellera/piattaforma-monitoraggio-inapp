export const TOUR_KEY = "inapp.guida.v2";

export interface TourState {
  /** Percorso attivo: "PROCESSO" oppure il ruolo del percorso per attore. */
  tour: string | null;
  step: number;
  mode: "closed" | "help" | "tour";
  /** Percorso da avviare al prossimo caricamento ("ROLE" = percorso del ruolo attivo). */
  autostart?: string;
}

export const CLOSED: TourState = { tour: null, step: 0, mode: "closed" };

export function readTourState(): TourState {
  try {
    return { ...CLOSED, ...(JSON.parse(localStorage.getItem(TOUR_KEY) ?? "null") ?? {}) };
  } catch {
    return CLOSED;
  }
}

export function writeTourState(s: TourState): void {
  localStorage.setItem(TOUR_KEY, JSON.stringify(s));
}

/** Avvia una guida alla prossima pagina caricata (login, pagina /guida). */
export function requestTourStart(tour = "ROLE"): void {
  writeTourState({ ...CLOSED, autostart: tour });
}

/** Porta il percorso a un passo preciso (mappa del processo). */
export function goToTourStep(tour: string, step: number): void {
  writeTourState({ tour, step, mode: "tour" });
}

/** Cambio di attore della demo: esce e rientra con l'utente demo indicato (password demo nota al login). */
export async function switchActor(login: string, then: string): Promise<void> {
  const m = document.cookie.match(/(?:^|; )inapp_csrf=([^;]+)/);
  await fetch("/api/auth/logout", { method: "POST", headers: { "x-csrf-token": m ? decodeURIComponent(m[1]!) : "" } }).catch(() => undefined);
  const res = await fetch("/api/auth/login", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ login, password: "Demo2026!" }) });
  window.location.href = res.ok ? then : `/login?utente=${encodeURIComponent(login)}`;
}
