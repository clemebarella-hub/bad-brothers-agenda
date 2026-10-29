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

function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
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

function StepLabel({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-500 text-black text-xs font-bold">
        {n}
      </span>
      <span className="text-sm font-semibold uppercase tracking-wide text-neutral-300">
        {children}
      </span>
    </div>
  );
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
      <div className="relative overflow-hidden rounded-2xl border border-amber-500/40 bg-gradient-to-b from-amber-500/10 to-transparent p-8 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-amber-500 text-black text-2xl font-bold">
          ✓
        </div>
        <p className="font-display text-2xl uppercase tracking-wide text-white mb-2">
          ¡Listo, {name}!
        </p>
        <p className="text-neutral-300">
          Tu hora quedó reservada para el{" "}
          <span className="text-amber-400 font-medium">
            {d.toLocaleDateString("es-CL", { weekday: "long", day: "numeric", month: "long" })}
          </span>{" "}
          a las{" "}
          <span className="text-amber-400 font-medium">
            {d.toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" })}
          </span>
          .
        </p>
        <p className="text-neutral-500 text-sm mt-4">El barbero te confirmará por WhatsApp.</p>
      </div>
    );
  }

  return (
    <div className="space-y-7">
      <section>
        <StepLabel n={1}>Servicio</StepLabel>
        <div className="grid grid-cols-1 gap-2">
          {services.map((s) => (
            <button
              key={s.id}
              onClick={() => setServiceId(s.id)}
              className={`flex items-center justify-between rounded-xl border px-4 py-3 transition-colors ${
                serviceId === s.id
                  ? "border-amber-500 bg-amber-500/10"
                  : "border-neutral-800 bg-neutral-900/60 hover:border-neutral-700"
              }`}
            >
              <span className="flex items-center gap-2">
                <span aria-hidden>✂️</span>
                <span className="font-medium">{s.name}</span>
              </span>
              <span className="text-amber-400 font-semibold">
                ${s.price_clp.toLocaleString("es-CL")}
              </span>
            </button>
          ))}
        </div>
      </section>

      <section>
        <StepLabel n={2}>Barbero</StepLabel>
        <div className="flex gap-3 flex-wrap">
          {barbers.map((b) => (
            <button
              key={b.id}
              onClick={() => setBarberId(b.id)}
              className={`flex items-center gap-2 rounded-full border pr-4 pl-1.5 py-1.5 transition-colors ${
                barberId === b.id
                  ? "border-amber-500 bg-amber-500/10"
                  : "border-neutral-800 bg-neutral-900/60 hover:border-neutral-700"
              }`}
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-amber-700 text-black text-xs font-bold">
                {initials(b.name)}
              </span>
              <span className="text-sm font-medium">{b.name}</span>
            </button>
          ))}
        </div>
      </section>

      <section>
        <StepLabel n={3}>Día</StepLabel>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {days.map((d) => (
            <button
              key={d.value}
              onClick={() => setDate(d.value)}
              className={`shrink-0 rounded-xl border px-3 py-2 text-sm capitalize transition-colors ${
                date === d.value
                  ? "border-amber-500 bg-amber-500/10 text-amber-300"
                  : "border-neutral-800 bg-neutral-900/60 hover:border-neutral-700"
              }`}
            >
              {d.label}
            </button>
          ))}
        </div>
      </section>

      <section>
        <StepLabel n={4}>Horario</StepLabel>
        {loadingSlots ? (
          <p className="text-neutral-500 text-sm">Cargando horarios...</p>
        ) : availableSlots.length === 0 ? (
          <p className="text-neutral-500 text-sm">No hay horarios disponibles ese día.</p>
        ) : (
          <div className="grid grid-cols-4 gap-2">
            {availableSlots.map((s) => {
              const t = s.split("T")[1].slice(0, 5);
              return (
                <button
                  key={s}
                  onClick={() => setChosenTime(s)}
                  className={`rounded-xl border py-2 text-sm font-medium transition-colors ${
                    slot === s
                      ? "border-amber-500 bg-amber-500 text-black"
                      : "border-neutral-800 bg-neutral-900/60 hover:border-neutral-700"
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
        <StepLabel n={5}>Tus datos</StepLabel>
        <input
          className="w-full rounded-xl bg-neutral-900/60 border border-neutral-800 px-4 py-3 placeholder:text-neutral-500 focus:border-amber-500 focus:outline-none"
          placeholder="Tu nombre"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <input
          className="w-full rounded-xl bg-neutral-900/60 border border-neutral-800 px-4 py-3 placeholder:text-neutral-500 focus:border-amber-500 focus:outline-none"
          placeholder="Tu WhatsApp (+56 9 ...)"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />
        {error && <p className="text-red-400 text-sm">{error}</p>}
        <button
          onClick={submit}
          disabled={submitting}
          className="w-full rounded-xl bg-gradient-to-r from-amber-400 to-amber-600 hover:from-amber-300 hover:to-amber-500 disabled:opacity-50 py-3.5 font-display uppercase tracking-wide text-black text-lg"
        >
          {submitting ? "Reservando..." : "Confirmar hora"}
        </button>
      </section>
    </div>
  );
}
