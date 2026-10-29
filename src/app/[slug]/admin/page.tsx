import { notFound } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import type { AppointmentRow } from "@/lib/types";

function waLink(phone: string, message: string) {
  const digits = phone.replace(/[^\d]/g, "");
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

export default async function AdminPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ pin?: string }>;
}) {
  const { slug } = await params;
  const { pin } = await searchParams;

  const { data: business } = await supabaseAdmin
    .from("businesses")
    .select("*")
    .eq("slug", slug)
    .single();

  if (!business) notFound();

  if (!process.env.ADMIN_PIN || pin !== process.env.ADMIN_PIN) {
    return (
      <main className="min-h-screen bg-neutral-950 text-neutral-100 flex items-center justify-center p-6">
        <p className="text-neutral-400">Acceso no autorizado. Agrega ?pin=TU_PIN a la URL.</p>
      </main>
    );
  }

  const { data: appointments } = await supabaseAdmin
    .from("appointments")
    .select("id, start_time, customer_name, customer_phone, status, barbers(name), services(name, price_clp)")
    .eq("business_id", business.id)
    .eq("status", "confirmed")
    .gte("start_time", new Date().toISOString().slice(0, 10))
    .order("start_time");

  const rows = (appointments ?? []) as unknown as AppointmentRow[];

  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-100 px-4 py-10">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">{business.name} — Reservas</h1>
        <div className="space-y-3">
          {rows.map((a) => {
            const d = new Date(a.start_time);
            const msg = `Hola ${a.customer_name}! Te confirmamos tu hora en ${business.name} el ${d.toLocaleDateString(
              "es-CL",
              { weekday: "long", day: "numeric", month: "long" }
            )} a las ${d.toLocaleTimeString("es-CL", {
              hour: "2-digit",
              minute: "2-digit",
            })}. Te esperamos!`;
            return (
              <div
                key={a.id}
                className="rounded-lg border border-neutral-700 p-4 flex justify-between items-center gap-4"
              >
                <div>
                  <p className="font-medium">
                    {d.toLocaleDateString("es-CL", { weekday: "short", day: "numeric", month: "short" })} ·{" "}
                    {d.toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" })}
                  </p>
                  <p className="text-sm text-neutral-400">
                    {a.customer_name} · {a.barbers?.name} · {a.services?.name}
                  </p>
                </div>
                <a
                  href={waLink(a.customer_phone, msg)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 rounded-lg bg-emerald-600 hover:bg-emerald-500 px-3 py-2 text-sm font-semibold"
                >
                  Confirmar WhatsApp
                </a>
              </div>
            );
          })}
          {rows.length === 0 && <p className="text-neutral-400">Sin reservas próximas.</p>}
        </div>
      </div>
    </main>
  );
}
