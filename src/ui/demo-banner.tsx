import { formatDateIt } from "@/contracts/format";

export function DemoBanner({ referenceDate }: { referenceDate: string }) {
  return (
    <div className="demo-banner" role="note">
      <span aria-hidden>▲</span> Ambiente DEMO — data di riferimento {formatDateIt(referenceDate)} — prototipo dimostrativo, non è un servizio ufficiale INAPP
    </div>
  );
}
