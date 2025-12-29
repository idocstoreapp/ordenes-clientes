import type { APIRoute } from "astro";
import { Resend } from "resend";

const resendApiKey = import.meta.env.RESEND_API_KEY;

export const POST: APIRoute = async ({ request }) => {
  try {
    if (!resendApiKey) {
      return new Response(
        JSON.stringify({ error: "RESEND_API_KEY no configurada" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    const resend = new Resend(resendApiKey);

    const body = await request.json();
    const { 
      to, 
      customerName, 
      orderNumber, 
      pdfBase64, 
      branchName,
      branchEmail 
    } = body;

    if (!to || !pdfBase64 || !orderNumber) {
      return new Response(
        JSON.stringify({ error: "Faltan datos requeridos: to, pdfBase64, orderNumber" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Email de origen (usar el de la sucursal si está disponible, o uno por defecto)
    const fromEmail = branchEmail || "noreply@idocstore.com";
    const fromName = branchName ? `${branchName} - iDocStore` : "iDocStore";

    // Contenido del email
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body {
              font-family: Arial, sans-serif;
              line-height: 1.6;
              color: #333;
            }
            .container {
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
            }
            .header {
              background-color: #3b82f6;
              color: white;
              padding: 20px;
              text-align: center;
              border-radius: 5px 5px 0 0;
            }
            .content {
              background-color: #f9fafb;
              padding: 30px;
              border-radius: 0 0 5px 5px;
            }
            .order-number {
              background-color: #1e40af;
              color: white;
              padding: 10px 20px;
              border-radius: 5px;
              display: inline-block;
              margin: 20px 0;
              font-size: 18px;
              font-weight: bold;
            }
            .footer {
              margin-top: 30px;
              padding-top: 20px;
              border-top: 1px solid #e5e7eb;
              font-size: 12px;
              color: #6b7280;
              text-align: center;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>iDocStore</h1>
              <p>Servicio Especializado en Reparación</p>
            </div>
            <div class="content">
              <h2>Estimado/a ${customerName || "Cliente"},</h2>
              
              <p>Nos complace informarle que su equipo ha sido <strong>ingresado con éxito</strong> en nuestro sistema y se encuentra actualmente <strong>en proceso de preparación</strong>.</p>
              
              <div style="text-align: center;">
                <div class="order-number">
                  Orden: ${orderNumber}
                </div>
              </div>
              
              <p>En el archivo PDF adjunto encontrará todos los detalles de su orden, incluyendo:</p>
              <ul>
                <li>Información del equipo ingresado</li>
                <li>Servicios solicitados</li>
                <li>Presupuesto detallado</li>
                <li>Políticas de garantía</li>
                <li>Datos de contacto de nuestra sucursal</li>
              </ul>
              
              <p>Nuestro equipo técnico revisará su equipo y se pondrá en contacto con usted en caso de ser necesario.</p>
              
              <p>Si tiene alguna consulta o necesita más información, no dude en contactarnos.</p>
              
              <p>Atentamente,<br><strong>Equipo iDocStore</strong></p>
              
              ${branchName ? `<p style="margin-top: 20px;"><strong>Sucursal:</strong> ${branchName}</p>` : ""}
            </div>
            <div class="footer">
              <p>Este es un correo automático, por favor no responda a este mensaje.</p>
              <p>&copy; ${new Date().getFullYear()} iDocStore. Todos los derechos reservados.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const result = await resend.emails.send({
      from: `${fromName} <${fromEmail}>`,
      to: [to],
      subject: `Orden ${orderNumber} - Equipo ingresado con éxito`,
      html: htmlContent,
      attachments: [
        {
          filename: `orden-${orderNumber}.pdf`,
          content: pdfBase64,
        },
      ],
    });

    if (result.error) {
      console.error("Error enviando email:", result.error);
      return new Response(
        JSON.stringify({ error: result.error.message || "Error enviando email" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Email enviado exitosamente",
        emailId: result.data?.id 
      }),
      { 
        status: 200, 
        headers: { "Content-Type": "application/json" } 
      }
    );
  } catch (error: any) {
    console.error("Error en send-order-email:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Error interno del servidor" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};

