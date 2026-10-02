"use client";
import { useState } from "react";
import type { Role } from "@/domain/model";
import { LOGIN_OF, TOURS } from "./content";
import { goToTourStep, requestTourStart, switchActor } from "./state";

/** Avvia un percorso; se il primo passo spetta a un altro attore, il pannello propone il cambio. */
export function StartTourButton({ tour, label = "Avvia il percorso", variant = "primary" }: { tour: string; label?: string; variant?: "primary" | "secondary" }) {
  return (
    <button
      type="button"
      className={`btn btn-${variant}`}
      onClick={() => {
        requestTourStart(tour);
        window.location.href = TOURS[tour]?.steps[0]?.path ?? "/";
      }}
    >
      {label}
    </button>
  );
}

/** Esce e rientra come l'utente demo del ruolo, avviandone il percorso. */
export function SwitchActorButton({ role, label }: { role: Role; label: string }) {
  const [busy, setBusy] = useState(false);
  return (
    <button
      type="button"
      className="btn btn-secondary"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        requestTourStart("ROLE");
        await switchActor(LOGIN_OF[role], TOURS[role]?.steps[0]?.path ?? "/");
      }}
    >
      {busy ? "Cambio in corso…" : label}
    </button>
  );
}

/** Riquadro della mappa del processo: porta il percorso per fasi al passo indicato. */
export function MapStepButton({ step, label, role, currentRole }: { step: number; label: string; role: Role; currentRole: Role }) {
  const target = TOURS.PROCESSO!.steps[step]!;
  return (
    <button
      type="button"
      className="map-step"
      onClick={async () => {
        goToTourStep("PROCESSO", step);
        if (role !== currentRole) await switchActor(LOGIN_OF[role], target.path);
        else window.location.href = target.path;
      }}
    >
      <span className="map-n">{step + 1}</span> {label}
    </button>
  );
}
