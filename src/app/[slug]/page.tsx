import { notFound } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import type { Barber, Service } from "@/lib/types";
import BookingForm from "@/components/BookingForm";

export default async function BookingPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const { data: business } = await supabaseAdmin
    .from("businesses")
    .select("*")
    .eq("slug", slug)
    .single();

  if (!business) notFound();

  const { data: barbers } = await supabaseAdmin
    .from("barbers")
    .select("*")
    .eq("business_id", business.id)
    .eq("active", true)
    .order("name");

  const { data: services } = await supabaseAdmin
    .from("services")
    .select("*")
    .eq("business_id", business.id)
    .eq("active", true)
    .order("price_clp");

  return (
    <main className="min-h-screen bg-black text-neutral-100 px-4 py-10">
      <div className="max-w-md mx-auto">
        <div className="mb-8">
          <div className="h-[3px] w-16 rounded-full bg-gradient-to-r from-red-600 via-amber-400 to-amber-600 mb-5" />
          <p className="text-amber-500 text-xs font-semibold uppercase tracking-[0.25em] mb-1">
            Barbería
          </p>
          <h1 className="font-display text-4xl uppercase tracking-wide leading-none text-white">
            {business.name}
          </h1>
          <p className="text-neutral-500 mt-2">Reserva tu hora online en 1 minuto</p>
        </div>
        <BookingForm
          businessId={business.id}
          barbers={(barbers ?? []) as Barber[]}
          services={(services ?? []) as Service[]}
        />
      </div>
    </main>
  );
}
