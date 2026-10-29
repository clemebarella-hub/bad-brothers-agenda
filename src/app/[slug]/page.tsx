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
    <main className="min-h-screen bg-neutral-950 text-neutral-100 px-4 py-10">
      <div className="max-w-md mx-auto">
        <h1 className="text-2xl font-bold mb-1">{business.name}</h1>
        <p className="text-neutral-400 mb-8">Reserva tu hora online</p>
        <BookingForm
          businessId={business.id}
          barbers={(barbers ?? []) as Barber[]}
          services={(services ?? []) as Service[]}
        />
      </div>
    </main>
  );
}
