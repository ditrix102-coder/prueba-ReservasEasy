/**
 * Helper para envío de correos electrónicos de confirmación y recordatorio de turnos.
 * Utiliza Resend (3,000 envíos gratis al mes).
 */
export async function sendReservationEmail(details: {
  to: string;
  customerName: string;
  serviceName: string;
  date: string;
  time: string;
  paymentMethod: 'transfer' | 'cash';
  alias?: string;
  cbu?: string;
  amount?: string;
}) {
  const resendApiKey = process.env.RESEND_API_KEY;

  const isTransfer = details.paymentMethod === 'transfer';
  
  const subject = isTransfer
    ? `⚠️ Recordatorio: Transfiere tu seña para confirmar turno (${details.date} ${details.time})`
    : `✅ Confirmación de turno: ${details.serviceName} - ${details.date} ${details.time}`;

  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; rounded: 12px;">
      <h2 style="color: #4f46e5;">Hola, ${details.customerName}!</h2>
      <p style="font-size: 16px; color: #333;">
        ${isTransfer 
          ? `Tu turno para <strong>${details.serviceName}</strong> ha sido pre-reservado.` 
          : `Tu turno para <strong>${details.serviceName}</strong> está confirmado.`}
      </p>
      
      <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
        <p style="margin: 5px 0;">📅 <strong>Fecha:</strong> ${details.date}</p>
        <p style="margin: 5px 0;">⏰ <strong>Hora:</strong> ${details.time} hs</p>
        <p style="margin: 5px 0;">💈 <strong>Servicio:</strong> ${details.serviceName}</p>
      </div>

      ${isTransfer ? `
        <div style="background-color: #fef3c7; border: 1px solid #f59e0b; padding: 15px; border-radius: 8px; margin: 20px 0; color: #92400e;">
          <h3 style="margin-top: 0;">⚠️ Instrucciones de Transferencia</h3>
          <p>Tienes <strong>30 minutos</strong> para realizar la transferencia de la seña y enviar el comprobante por WhatsApp para asegurar tu turno.</p>
          <p style="font-size: 15px; margin: 5px 0;"><strong>Alias:</strong> ${details.alias || 'reservaseasy.mp'}</p>
          <p style="font-size: 15px; margin: 5px 0;"><strong>CBU/CVU:</strong> ${details.cbu || '00000031000123456789'}</p>
        </div>
      ` : ''}

      <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
        Si tienes alguna duda o deseas reprogramar, por favor contáctanos directamente.
      </p>
    </div>
  `;

  if (!resendApiKey) {
    console.log('[Email Simulation] RESEND_API_KEY no configurada. Simulación de correo enviado a:', details.to);
    return { success: true, simulated: true };
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'ReservasEasy <onboarding@resend.dev>',
        to: details.to,
        subject,
        html: htmlContent,
      }),
    });

    const data = await response.json();
    return { success: response.ok, data };
  } catch (error) {
    console.error('Error enviando email via Resend:', error);
    return { success: false, error };
  }
}
