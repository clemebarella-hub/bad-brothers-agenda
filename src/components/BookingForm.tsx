"use client";

import { useEffect, useMemo, useState } from "react";
import type { Barber, Service } from "@/lib/types";

const OPEN_MINUTES = 10 * 60 + 30; // 10:30
const CLOSE_MINUTES = 19 * 60; // 19:00
const SLOT_MINUTES = 30;

function toLocalDateStr(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function nextAvailableDays(count: number, startTs: number) {
  const days: { value: string; label: string }[] = [];
  let cursor = new Date(startTs);
  while (days.length < count) {
    if (cursor.getDay() !== 0) {
      days.push({
        value: toLocalDateStr(cursor),
        label: cursor.toLocaleDateString("es-CL", {
          weekday: "short",
          day: "numeric",
          month: "short",
        }),
      });
    }
    const next = new Date(cursor);
    next.setDate(cursor.getDate() + 1);
    cursor = next;
  }
  return days;
}

function buildDaySlots(dateStr: string) {
  const slots: string[] = [];
  for (let t = OPEN_MINUTES; t < CLOSE_MINUTES; t += SLOT_MINUTES) {
    const h = Math.floor(t / 60);
    const m = t % 60;
    slots.push(`${dateStr}T${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:00`);
  }
  return slots;
}

export default function BookingForm({
  businessId,
  barbers,
  services,
}: {
  businessId: string;
  barbers: Barber[];
  services: Service[];
}) {
  const [nowTick, setNowTick] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNowTick(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);

  const days = useMemo(() => nextAvailableDays(7, nowTick), [nowTick]);
  const [serviceId, setServiceId] = useState(services[0]?.id ?? "");
  const [barberId, setBarberId] = useState(barbers[0]?.id ?? "");
  const [date, setDate] = useState(days[0]?.value ?? "");
  const [chosenTime, setChosenTime] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState<string | null>(null);

  // bookedData solo es válido cuando coincide con el barbero/día seleccionados
  // actualmente; así evitamos tener que "resetear" estado manualmente al cambiar.
  const [bookedData, setBookedData] = useState<{
    barberId: string;
    date: string;
    times: string[];
  } | null>(null);

  useEffect(() => {
    if (!barberId || !date) return;
    let active = true;
    fetch(`/api/availability?businessId=${businessId}&barberId=${barberId}&date=${date}`)
      .then((r) => r.json())
      .then((d) => {
        if (active) setBookedData({ barberId, date, times: d.booked ?? [] });
      });
    return () => {
      active = false;
    };
  }, [barberId, date, businessId]);

  const loadingSlots = !(bookedData && bookedData.barberId === barberId && bookedData.date === date);
  const bookedSet = useMemo(
    () => new Set((loadingSlots ? [] : bookedData!.times).map((b) => b.slice(0, 16))),
    [loadingSlots, bookedData]
  );

  const todayStr = toLocalDateStr(new Date(nowTick));
  const allSlots = useMemo(() => buildDaySlots(date), [date]);
  const availableSlots = allSlots.filter((s) => {
    if (bookedSet.has(s.slice(0, 16))) return false;
    if (date === todayStr) {
      const [y, mo, da] = date.split("-").map(Number);
      const [h, m] = s.split("T")[1].split(":").map(Number);
      const slotDate = new Date(y, mo - 1, da, h, m, 0, 0);
      if (slotDate.getTime() < nowTick) return false;
    }
    return true;
  });

  // El horario elegido solo es válido si sigue perteneciendo al barbero/día actuales.
  const slot = chosenTime && availableSlots.includes(chosenTime) ? chosenTime : null;

  async function submit() {
    if (!slot || !name.trim() || !phone.trim()) {
      setError("Completa tu nombre, teléfono y elige un horario.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessId,
          barberId,
          serviceId,
          customerName: name.trim(),
          customerPhone: phone.trim(),
          startTime: slot,
        }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error ?? "No se pudo reservar, intenta de nuevo.");
      }
      setConfirmed(slot);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error inesperado");
    } finally {
      setSubmitting(false);
    }
  }

  if (confirmed) {
    const [y, mo, da] = confirmed.split("T")[0].split("-").map(Number);
    const [h, m] = confirmed.split("T")[1].split(":").map(Number);
    const d = new Date(y, mo - 1, da, h, m);
    return (
      <div className="rounded-xl bg-emerald-900/30 border border-emerald-700 p-6 text-center">
        <p className="text-lg font-semibold mb-2">¡Listo, {name}!</p>
        <p className="text-neutral-200">
          Tu hora quedó reservada para el{" "}
          {d.toLocaleDateString("es-CL", { weekday: "long", day: "numeric", month: "long" })} a
          las {d.toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" })}.
        </p>
        <p className="text-neutral-400 text-sm mt-3">El barbero te confirmará por WhatsApp.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section>
        <label className="block text-sm font-medium mb-2">Servicio</label>
        <div className="grid grid-cols-1 gap-2">
          {services.map((s) => (
            <button
              key={s.id}
              onClick={() => setServiceId(s.id)}
              className={`text-left rounded-lg border px-4 py-3 ${
                serviceId === s.id ? "border-emerald-500 bg-emerald-950/40" : "border-neutral-700"
              }`}
            >
              <div className="flex justify-between">
                <span>{s.name}</span>
                <span className="text-neutral-400">${s.price_clp.toLocaleString("es-CL")}</span>
              </div>
            </button>
          ))}
        </div>
      </section>

      <section>
        <label className="block text-sm font-medium mb-2">Barbero</label>
        <div className="flex gap-2 flex-wrap">
          {barbers.map((b) => (
            <button
              key={b.id}
              onClick={() => setBarberId(b.id)}
              className={`rounded-full border px-4 py-2 text-sm ${
                barberId === b.id ? "border-emerald-500 bg-emerald-950/40" : "border-neutral-700"
              }`}
            >
              {b.name}
            </button>
          ))}
        </div>
      </section>

      <section>
        <label className="block text-sm font-medium mb-2">Día</label>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {days.map((d) => (
            <button
              key={d.value}
              onClick={() => setDate(d.value)}
              className={`shrink-0 rounded-lg border px-3 py-2 text-sm capitalize ${
                date === d.value ? "border-emerald-500 bg-emerald-950/40" : "border-neutral-700"
              }`}
            >
              {d.label}
            </button>
          ))}
        </div>
      </section>

      <section>
        <label className="block text-sm font-medium mb-2">Horario</label>
        {loadingSlots ? (
          <p className="text-neutral-400 text-sm">Cargando horarios...</p>
        ) : availableSlots.length === 0 ? (
          <p className="text-neutral-400 text-sm">No hay horarios disponibles ese día.</p>
        ) : (
          <div className="grid grid-cols-4 gap-2">
            {availableSlots.map((s) => {
              const t = s.split("T")[1].slice(0, 5);
              return (
                <button
                  key={s}
                  onClick={() => setChosenTime(s)}
                  className={`rounded-lg border py-2 text-sm ${
                    slot === s ? "border-emerald-500 bg-emerald-950/40" : "border-neutral-700"
                  }`}
                >
                  {t}
                </button>
              );
            })}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <input
          className="w-full rounded-lg bg-neutral-900 border border-neutral-700 px-4 py-3"
          placeholder="Tu nombre"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <input
          className="w-full rounded-lg bg-neutral-900 border border-neutral-700 px-4 py-3"
          placeholder="Tu WhatsApp (+56 9 ...)"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />
        {error && <p className="text-red-400 text-sm">{error}</p>}
        <button
          onClick={submit}
          disabled={submitting}
          className="w-full rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 py-3 font-semibold"
        >
          {submitting ? "Reservando..." : "Confirmar hora"}
        </button>
      </section>
    </div>
  );
}
