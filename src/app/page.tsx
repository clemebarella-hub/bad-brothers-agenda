export default function Home() {
  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-100 flex items-center justify-center p-6">
      <div className="max-w-md text-center">
        <h1 className="text-2xl font-bold mb-2">Agenda para barberías</h1>
        <p className="text-neutral-400">
          Cada barbería tiene su propio link de reserva en{" "}
          <code className="rounded bg-white/10 px-1.5 py-0.5">/su-slug</code>.
        </p>
      </div>
    </main>
  );
}
