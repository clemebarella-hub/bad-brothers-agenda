function formatWhen(startTime: string) {
  const [datePart, timePart] = startTime.split("T");
  const [y, m, d] = datePart.split("-").map(Number);
  const [h, mi] = timePart.split(":").map(Number);
  const date = new Date(y, m - 1, d, h, mi);
  return date.toLocaleString("es-CL", {
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export async function sendNewAppointmentEmail(params: {
  businessName: string;
  barberName: string;
  serviceName: string;
  customerName: string;
  customerPhone: string;
  startTime: string;
  adminUrl: string;
}) {
  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.NOTIFY_EMAIL;
  if (!apiKey || !to) return;

  const whenLabel = formatWhen(params.startTime);

  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Agenda Bad Brothers <onboarding@resend.dev>",
        to,
        subject: `Nueva reserva: ${params.customerName} - ${whenLabel}`,
        html: `
          <p><strong>${params.businessName}</strong> tiene una reserva nueva.</p>
          <ul>
            <li>Cliente: ${params.customerName} (${params.customerPhone})</li>
            <li>Barbero: ${params.barberName}</li>
            <li>Servicio: ${params.serviceName}</li>
            <li>Cuándo: ${whenLabel}</li>
          </ul>
          <p><a href="${params.adminUrl}">Ver en el panel y confirmar por WhatsApp</a></p>
        `,
      }),
    });
  } catch {
    // Un fallo al notificar no debe impedir que la reserva quede guardada.
  }
}
