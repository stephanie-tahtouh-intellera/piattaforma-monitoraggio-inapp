"use client";
import { useEffect, useLayoutEffect, useRef, useState } from "react";

/**
 * Formatta un importo mentre si digita: migliaia con il punto, decimali con la virgola (max 2).
 * "40000" → "40.000"; "1234,5" → "1.234,5". Il campo mostra poi sempre due decimali (`formatAmountWithDecimals`). Un solo punto seguito da 1–2 cifre in coda
 * (testo incollato come "40000.50") è letto come separatore decimale. Solo testo, nessun calcolo.
 */
export function formatAmountText(raw: string): string {
  let s = raw.replace(/[^\d.,]/g, "");
  const lastComma = s.lastIndexOf(",");
  let intPart: string;
  let decPart: string | null = null;
  if (lastComma >= 0) {
    intPart = s.slice(0, lastComma).replace(/[.,]/g, "");
    decPart = s.slice(lastComma + 1).replace(/[.,]/g, "").slice(0, 2);
  } else if (/^\d+\.\d{1,2}$/.test(s)) {
    [intPart, decPart] = s.split(".") as [string, string];
  } else {
    intPart = s.replace(/\./g, "");
  }
  intPart = intPart.replace(/^0+(?=\d)/, "");
  const grouped = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return decPart === null ? grouped : `${grouped || "0"},${decPart}`;
}

/** Come `formatAmountText`, ma con sempre due decimali: "40000" → "40.000,00", "40000,5" → "40.000,50". Vuoto resta vuoto. */
export function formatAmountWithDecimals(raw: string): string {
  const t = formatAmountText(raw);
  if (t === "") return "";
  const i = t.indexOf(",");
  if (i < 0) return `${t},00`;
  return `${t.slice(0, i)},${t.slice(i + 1).padEnd(2, "0")}`;
}

/** Numero di cifre e virgole prima della posizione `pos`: serve a rimettere il cursore dopo la riformattazione. */
const significantBefore = (text: string, pos: number) => text.slice(0, pos).replace(/[^\d,]/g, "").length;
const positionAfter = (text: string, count: number) => {
  if (count <= 0) return 0;
  let seen = 0;
  for (let i = 0; i < text.length; i++) {
    if (/[\d,]/.test(text[i]!)) seen++;
    if (seen === count) return i + 1;
  }
  return text.length;
};

/** Campo importo con separatori automatici; l'invio avviene con il testo mostrato (il form lo normalizza). */
export function AmountInput({
  id,
  name,
  value,
  defaultValue = "",
  onChange,
  required,
  width = 200,
  describedBy,
}: {
  id: string;
  name?: string;
  value?: string;
  defaultValue?: string;
  onChange?: (text: string) => void;
  required?: boolean | undefined;
  width?: number;
  describedBy?: string | undefined;
}) {
  const [text, setText] = useState(formatAmountWithDecimals(value ?? defaultValue));
  const ref = useRef<HTMLInputElement>(null);
  const caret = useRef<number | null>(null);

  // Valore controllato dall'esterno (per esempio "Assegna tutto il totale a…")
  useEffect(() => {
    if (value !== undefined && value !== text) setText(formatAmountWithDecimals(value));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  useLayoutEffect(() => {
    if (caret.current !== null && ref.current && document.activeElement === ref.current) {
      ref.current.setSelectionRange(caret.current, caret.current);
    }
    caret.current = null;
  }, [text]);

  return (
    <input
      ref={ref}
      id={id}
      {...(name ? { name } : {})}
      type="text"
      inputMode="decimal"
      autoComplete="off"
      required={required}
      aria-describedby={describedBy}
      style={{ textAlign: "right", width }}
      value={text}
      onChange={(e) => {
        const next = formatAmountWithDecimals(e.target.value);
        caret.current = positionAfter(next, significantBefore(e.target.value, e.target.selectionStart ?? e.target.value.length));
        setText(next);
        onChange?.(next);
      }}
    />
  );
}
