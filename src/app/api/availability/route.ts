import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const businessId = searchParams.get("businessId");
  const barberId = searchParams.get("barberId");
  const date = searchParams.get("date");

  if (!businessId || !barberId || !date) {
    return NextResponse.json({ error: "Faltan parámetros" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("appointments")
    .select("start_time")
    .eq("business_id", businessId)
    .eq("barber_id", barberId)
    .eq("status", "confirmed")
    .gte("start_time", `${date}T00:00:00`)
    .lt("start_time", `${date}T23:59:59`);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ booked: (data ?? []).map((a) => a.start_time as string) });
}
