import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { sendNewAppointmentEmail } from "@/lib/notify";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { businessId, barberId, serviceId, customerName, customerPhone, startTime } = body;

  if (!businessId || !barberId || !serviceId || !customerName || !customerPhone || !startTime) {
    return NextResponse.json({ error: "Faltan datos" }, { status: 400 });
  }

  const { data: existing } = await supabaseAdmin
    .from("appointments")
    .select("id")
    .eq("business_id", businessId)
    .eq("barber_id", barberId)
    .eq("start_time", startTime)
    .eq("status", "confirmed")
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ error: "Ese horario ya fue tomado, elige otro." }, { status: 409 });
  }

  const { data, error } = await supabaseAdmin
    .from("appointments")
    .insert({
      business_id: businessId,
      barber_id: barberId,
      service_id: serviceId,
      customer_name: customerName,
      customer_phone: customerPhone,
      start_time: startTime,
      status: "confirmed",
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const [{ data: business }, { data: barber }, { data: service }] = await Promise.all([
    supabaseAdmin.from("businesses").select("name, slug").eq("id", businessId).single(),
    supabaseAdmin.from("barbers").select("name").eq("id", barberId).single(),
    supabaseAdmin.from("services").select("name").eq("id", serviceId).single(),
  ]);

  if (business && barber && service) {
    await sendNewAppointmentEmail({
      businessName: business.name,
      barberName: barber.name,
      serviceName: service.name,
      customerName,
      customerPhone,
      startTime,
      adminUrl: `${req.nextUrl.origin}/${business.slug}/admin?pin=${process.env.ADMIN_PIN}`,
    });
  }

  return NextResponse.json({ appointment: data });
}
