"use client";
import { CalendarDays } from "lucide-react";
import { useEffect, useRef, useState } from "react";

const toIt = (iso: string) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : "";
};

/** "gg/mm/aaaa" → "aaaa-mm-gg"; stringa vuota se il formato o il giorno non sono validi. */
export const itToIso = (it: string) => {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(it.trim());
  if (!m) return "";
  const [, d, mo, y] = m;
  const dt = new Date(Date.UTC(Number(y), Number(mo) - 1, Number(d)));
  return dt.getUTCFullYear() === Number(y) && dt.getUTCMonth() === Number(mo) - 1 && dt.getUTCDate() === Number(d) ? `${y}-${mo}-${d}` : "";
};

/** Inserisce le barre mentre si digitano le cifre: 01102026 → 01/10/2026. */
const mask = (raw: string) => {
  const d = raw.replace(/\D/g, "").slice(0, 8);
  return d.length > 4 ? `${d.slice(0, 2)}/${d.slice(2, 4)}/${d.slice(4)}` : d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d;
};

/**
 * Data in formato italiano (gg/mm/aaaa) con calendario. Il valore scambiato è ISO (aaaa-mm-gg),
 * indipendente dalla lingua del browser; con `name` invia l'ISO in un campo nascosto.
 */
export function DateInput({
  id,
  name,
  value,
  defaultValue = "",
  onChange,
  required,
  min,
  describedBy,
  width = 170,
}: {
  id: string;
  name?: string;
  value?: string;
  defaultValue?: string;
  onChange?: (iso: string) => void;
  required?: boolean | undefined;
  min?: string | undefined;
  describedBy?: string | undefined;
  width?: number;
}) {
  const [text, setText] = useState(toIt(value ?? defaultValue));
  const picker = useRef<HTMLInputElement>(null);
  const field = useRef<HTMLInputElement>(null);
  const iso = itToIso(text);

  // Valore controllato dall'esterno (per esempio il passo 2 della simulazione).
  useEffect(() => {
    if (value !== undefined && value !== iso) setText(toIt(value));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  // La validità nativa blocca l'invio del modulo e mostra il messaggio nel campo.
  useEffect(() => {
    const el = field.current;
    if (!el) return;
    if (text !== "" && !iso) el.setCustomValidity("Inserisci una data valida nel formato gg/mm/aaaa.");
    else if (iso && min && iso < min) el.setCustomValidity(`La data non può essere precedente al ${toIt(min)}.`);
    else el.setCustomValidity("");
  }, [text, iso, min]);

  const update = (next: string) => {
    setText(next);
    onChange?.(itToIso(next));
  };

  return (
    <span className="date-input" style={{ width }}>
      <input
        ref={field}
        id={id}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        placeholder="gg/mm/aaaa"
        maxLength={10}
        value={text}
        required={required}
        aria-describedby={describedBy}
        onChange={(e) => update(mask(e.target.value))}
      />
      <button
        type="button"
        className="date-input-btn"
        aria-label="Apri il calendario"
        onClick={() => {
          try {
            picker.current?.showPicker();
          } catch {
            picker.current?.focus();
          }
        }}
      >
        <CalendarDays size={16} aria-hidden />
      </button>
      <input ref={picker} className="date-input-native" type="date" tabIndex={-1} aria-hidden value={iso} min={min} onChange={(e) => update(toIt(e.target.value))} />
      {name ? <input type="hidden" name={name} value={iso} /> : null}
    </span>
  );
}
