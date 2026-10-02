"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { formatEuro } from "@/contracts/format";

/** Upload PDF/XLSX/ZIP con esito per file (US-020). */
export function UploadForm({ code }: { code: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const m = document.cookie.match(/(?:^|; )inapp_csrf=([^;]+)/);
    setBusy(true);
    setMsg(null);
    const res = await fetch(`/api/procedures/${code}/documents`, { method: "POST", body: fd, headers: { "x-csrf-token": m ? decodeURIComponent(m[1]!) : "" } });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) setMsg({ ok: false, text: data.error?.message ?? `Errore ${res.status}` });
    else {
      const proc = (data.processed as { state: string; fields: number; ocrPages: number }[]) ?? [];
      setMsg({
        ok: true,
        text: `${data.stored.length} file acquisiti${data.rejected.length ? `, ${data.rejected.length} rifiutati (${data.rejected.join("; ")})` : ""}. ${proc.map((p) => `${p.state}, ${p.fields} campi proposti${p.ocrPages ? `, OCR su ${p.ocrPages} pagine` : ""}`).join(" · ")}`,
      });
      router.refresh();
    }
  }
  void formatEuro;
  return (
    <form onSubmit={submit} className="actions" style={{ marginBottom: 12 }}>
      <label htmlFor="up-file" className="label">Carica documenti (PDF, XLSX o ZIP, max 20 MB)</label>
      <input id="up-file" name="file" type="file" accept=".pdf,.xlsx,.zip" multiple required />
      <button className="btn btn-secondary" disabled={busy} aria-busy={busy}>{busy ? "Elaborazione in corso (OCR)…" : "Carica ed elabora"}</button>
      {msg ? <div className={`alert-box ${msg.ok ? "success" : "error"}`} role={msg.ok ? "status" : "alert"}>{msg.text}</div> : null}
    </form>
  );
}
