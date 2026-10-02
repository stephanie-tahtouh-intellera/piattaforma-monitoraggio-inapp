import { configuredReferenceDate } from "@/infrastructure/clock";
import { getDb } from "@/infrastructure/db/connection";
import { ensureBootstrapped } from "@/server/runtime";
import { DemoBanner } from "@/ui/demo-banner";
import { LoginForm } from "./login-form";

export const dynamic = "force-dynamic";
export const metadata = { title: "Accesso" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const q = await searchParams;
  const utente = typeof q.utente === "string" ? q.utente : undefined;
  await ensureBootstrapped();
  const ref = configuredReferenceDate(getDb());
  return (
    <div className="login-page">
      <DemoBanner referenceDate={ref} />
      <div className="login-wrap">
        <div className="login-card">
          <div className="login-side">
            <img src="/brand/inapp-logo-white.svg" alt="INAPP — Istituto nazionale per l'analisi delle politiche pubbliche" />
            <h1>Monitoraggio Gare e Contratti</h1>
            <p>Programmazione, scadenze, riprogrammazione e controllo finanziario delle procedure di acquisto del PN Giovani, Donne e Lavoro.</p>
            <p style={{ marginTop: "auto", fontSize: 13, opacity: 0.9 }}>Prototipo dimostrativo. Calcoli deterministici; nessuna decisione automatica.</p>
          </div>
          <LoginForm initialLogin={utente} startTour={q.guida === "1"} />
        </div>
      </div>
    </div>
  );
}
