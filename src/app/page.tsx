export default function Home() {
  return (
    <main className="min-h-screen bg-black text-neutral-100 flex items-center justify-center p-6">
      <div className="max-w-md text-center">
        <div className="h-[3px] w-16 mx-auto rounded-full bg-gradient-to-r from-red-600 via-amber-400 to-amber-600 mb-6" />
        <h1 className="font-display text-3xl uppercase tracking-wide text-white mb-2">
          Agenda para barberías
        </h1>
        <p className="text-neutral-500">
          Cada barbería tiene su propio link de reserva en{" "}
          <code className="rounded bg-white/10 px-1.5 py-0.5 text-amber-400">/su-slug</code>.
        </p>
      </div>
    </main>
  );
}
