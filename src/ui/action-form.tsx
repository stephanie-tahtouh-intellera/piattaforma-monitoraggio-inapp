"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AmountInput } from "./amount-input";
import { api } from "./api-client";
import { DateInput } from "./date-input";

export interface FieldDef {
  name: string;
  label: string;
  type?: "text" | "date" | "textarea" | "select" | "amount" | "checkbox";
  required?: boolean;
  defaultValue?: string;
  options?: { value: string; label: string }[];
  help?: string;
}

/** Form d'azione verso /api: CSRF, motivazioni, errori di dominio leggibili (07 §6.10). */
export function ActionForm({
  endpoint,
  method = "POST",
  fields = [],
  submitLabel,
  variant = "primary",
  confirm,
  inline = false,
  successMessage,
  redirectTo,
}: {
  endpoint: string;
  method?: string;
  fields?: FieldDef[];
  submitLabel: string;
  variant?: "primary" | "secondary" | "danger" | "ghost";
  confirm?: string;
  inline?: boolean;
  successMessage?: string;
  redirectTo?: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (confirm && !window.confirm(confirm)) return;
    const fd = new FormData(e.currentTarget);
    const payload: Record<string, unknown> = {};
    for (const f of fields) {
      if (f.type === "checkbox") payload[f.name] = fd.get(f.name) === "on";
      else {
        let v = String(fd.get(f.name) ?? "");
        if (f.type === "amount") v = v.replace(/\./g, "").replace(",", ".").replace(/\s|€/g, "");
        // Campi "lines.<anno>": importi per annualità inviati come elenco (DEC-107)
        const yl = /^lines\.(\d{4})$/.exec(f.name);
        if (yl) {
          if (v !== "") ((payload.lines ??= []) as { year: number; amount: string }[]).push({ year: Number(yl[1]), amount: v });
        } else if (v !== "") payload[f.name] = v;
      }
    }
    setBusy(true);
    setError(null);
    setOk(null);
    try {
      const res = await api<Record<string, unknown>>(endpoint, method, payload);
      setOk(successMessage ?? "Operazione registrata.");
      if (redirectTo) router.push(typeof res.redirect === "string" ? res.redirect : redirectTo);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Errore");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className={inline ? "actions" : "stack"} style={inline ? undefined : { maxWidth: 560 }}>
      {error ? <div className="alert-box error" role="alert">{error}</div> : null}
      {ok ? <div className="alert-box success" role="status">{ok}</div> : null}
      {fields.map((f) => {
        const id = `${endpoint}-${f.name}`.replace(/[^a-z0-9-]/gi, "-");
        return (
          <div className="field" key={f.name} style={f.type === "checkbox" ? { flexDirection: "row", alignItems: "center", gap: 8 } : undefined}>
            {f.type === "checkbox" ? <input id={id} name={f.name} type="checkbox" defaultChecked={f.defaultValue === "true"} /> : null}
            <label htmlFor={id}>
              {f.label}
              {f.required ? " (obbligatorio)" : ""}
            </label>
            {f.type === "textarea" ? (
              <textarea id={id} name={f.name} required={f.required} defaultValue={f.defaultValue} aria-describedby={f.help ? `${id}-h` : undefined} />
            ) : f.type === "select" ? (
              <select id={id} name={f.name} defaultValue={f.defaultValue}>
                {f.options?.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            ) : f.type === "checkbox" ? null : f.type === "date" ? (
              <DateInput id={id} name={f.name} defaultValue={f.defaultValue ?? ""} required={f.required} describedBy={f.help ? `${id}-h` : undefined} />
            ) : f.type === "amount" ? (
              <AmountInput id={id} name={f.name} defaultValue={f.defaultValue ?? ""} required={f.required} describedBy={f.help ? `${id}-h` : undefined} />
            ) : (
              <input
                id={id}
                name={f.name}
                type="text"
                required={f.required}
                defaultValue={f.defaultValue}
                aria-describedby={f.help ? `${id}-h` : undefined}
              />
            )}
            {f.help ? <span id={`${id}-h`} className="help">{f.help}</span> : null}
          </div>
        );
      })}
      <div>
        <button className={`btn btn-${variant}${inline ? " btn-sm" : ""}`} type="submit" disabled={busy} aria-busy={busy}>
          {busy ? "Salvataggio in corso…" : submitLabel}
        </button>
      </div>
    </form>
  );
}
