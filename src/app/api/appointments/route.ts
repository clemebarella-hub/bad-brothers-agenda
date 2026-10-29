import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

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

  return NextResponse.json({ appointment: data });
}
