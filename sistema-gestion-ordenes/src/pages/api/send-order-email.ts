import type { APIRoute } from "astro";
import { Resend } from "resend";

const resendApiKey = import.meta.env.RESEND_API_KEY;

export const POST: APIRoute = async ({ request }) => {
  // Logging inmediato para verificar que la función se ejecuta
  console.log("[EMAIL API] ========================================");
  console.log("[EMAIL API] FUNCIÓN EJECUTADA - Iniciando envío de email");
  console.log("[EMAIL API] Timestamp:", new Date().toISOString());
  console.log("[EMAIL API] ========================================");
  
  try {
    if (!resendApiKey) {
      console.error("[EMAIL API] ERROR: RESEND_API_KEY no configurada");
      return new Response(
        JSON.stringify({ error: "RESEND_API_KEY no configurada" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
    console.log("[EMAIL API] API Key encontrada");
    console.log("[EMAIL API] API Key length:", resendApiKey ? resendApiKey.length : 0);

    const resend = new Resend(resendApiKey);

    const body = await request.json();
    const { 
      to, 
      customerName, 
      orderNumber, 
      pdfBase64, 
      branchName,
      branchEmail,
      emailType = 'order_created' // 'order_created' o 'ready_for_pickup'
    } = body;
    
    console.log("[EMAIL API] Datos recibidos:", {
      to: to ? `${to.substring(0, 3)}***` : 'no especificado',
      orderNumber,
      emailType,
      hasPdf: !!pdfBase64,
      branchName: branchName || 'no especificado'
    });

    if (!to || !orderNumber) {
      return new Response(
        JSON.stringify({ error: "Faltan datos requeridos: to, orderNumber" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // PDF solo es requerido para order_created
    if (emailType === 'order_created' && !pdfBase64) {
      return new Response(
        JSON.stringify({ error: "pdfBase64 es requerido para order_created" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Email de origen (usar el de la sucursal si está disponible, o uno por defecto)
    // IMPORTANTE: El email debe ser del dominio verificado en Resend
    const fromEmail = branchEmail || "informacion@app.idocstore.cl";
    const fromName = branchName ? `${branchName} - iDocStore` : "iDocStore";
    
    // Validar que el email del destinatario sea válido
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(to)) {
      console.error("Email del destinatario inválido:", to);
      return new Response(
        JSON.stringify({ error: `Email del destinatario inválido: ${to}` }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }
    
    // Log para debugging (sin exponer información sensible)
    console.log("[EMAIL API] Preparando email:", {
      to: to ? `${to.substring(0, 3)}***` : 'no especificado',
      from: fromEmail,
      subject: emailType === 'ready_for_pickup' ? `Orden ${orderNumber} - Listo` : `Orden ${orderNumber} - Creada`,
      emailType: emailType,
      hasPdf: !!pdfBase64
    });

    // Determinar contenido del email según el tipo
    let htmlContent = '';
    let subject = '';
    
    if (emailType === 'ready_for_pickup') {
      // Email para cuando el equipo está listo para retirar
      subject = `Orden ${orderNumber} - ¡Su equipo está listo para retirar!`;
      htmlContent = `
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
                background-color: #10b981;
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
                background-color: #059669;
                color: white;
                padding: 10px 20px;
                border-radius: 5px;
                display: inline-block;
                margin: 20px 0;
                font-size: 18px;
                font-weight: bold;
              }
              .highlight-box {
                background-color: #d1fae5;
                border-left: 4px solid #10b981;
                padding: 15px;
                margin: 20px 0;
                border-radius: 4px;
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
                <h1>✅ iDocStore</h1>
                <p>¡Su equipo está listo!</p>
              </div>
              <div class="content">
                <h2>Estimado/a ${customerName || "Cliente"},</h2>
                
                <div class="highlight-box">
                  <p style="margin: 0; font-size: 16px; font-weight: bold;">🎉 ¡Excelentes noticias! Su equipo está <strong>listo para retirar</strong>.</strong></p>
                </div>
                
                <div style="text-align: center;">
                  <div class="order-number">
                    Orden: ${orderNumber}
                  </div>
                </div>
                
                <p>Nos complace informarle que la reparación de su equipo ha sido <strong>completada exitosamente</strong> y está disponible para retiro en nuestra sucursal.</p>
                
                <p><strong>Próximos pasos:</strong></p>
                <ul>
                  <li>Puede retirar su equipo en nuestra sucursal durante nuestro horario de atención</li>
                  <li>No olvide traer su documento de identidad</li>
                  <li>Si tiene alguna consulta, no dude en contactarnos</li>
                </ul>
                
                ${branchName ? `
                  <p style="margin-top: 20px;"><strong>Sucursal:</strong> ${branchName}</p>
                  ${branchEmail ? `<p><strong>Email:</strong> ${branchEmail}</p>` : ""}
                ` : ""}
                
                <p>Esperamos verlo pronto para entregarle su equipo.</p>
                
                <p>Atentamente,<br><strong>Equipo iDocStore</strong></p>
              </div>
              <div class="footer">
                <p>Este es un correo automático, por favor no responda a este mensaje.</p>
                <p>&copy; ${new Date().getFullYear()} iDocStore. Todos los derechos reservados.</p>
              </div>
            </div>
          </body>
        </html>
      `;
    } else {
      // Email para cuando se crea la orden (comportamiento original)
      subject = `Orden ${orderNumber} - Equipo ingresado con éxito`;
      htmlContent = `
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
    }

    const emailData: any = {
      from: `${fromName} <${fromEmail}>`,
      to: [to],
      subject: subject,
      html: htmlContent,
    };

    // Solo adjuntar PDF si está disponible y es para orden creada
    if (pdfBase64 && emailType === 'order_created') {
      emailData.attachments = [
        {
          filename: `orden-${orderNumber}.pdf`,
          content: pdfBase64,
        },
      ];
    }

    console.log("[EMAIL API] Enviando email a Resend...");
    const result = await resend.emails.send(emailData);

    if (result.error) {
      console.error("[EMAIL API] ERROR desde Resend:", {
        error: result.error,
        message: result.error.message,
        name: result.error.name,
        from: fromEmail,
        to: to ? `${to.substring(0, 3)}***` : 'no especificado'
      });
      return new Response(
        JSON.stringify({ 
          error: result.error.message || "Error enviando email",
          details: result.error.name || "Error desconocido",
          from: fromEmail
        }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    console.log("[EMAIL API] Email enviado exitosamente:", {
      emailId: result.data?.id,
      to: to ? `${to.substring(0, 3)}***` : 'no especificado',
      from: fromEmail
    });

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
    console.error("[EMAIL API] ========================================");
    console.error("[EMAIL API] ERROR EXCEPCIÓN CAPTURADA:");
    console.error("[EMAIL API] Message:", error.message);
    console.error("[EMAIL API] Name:", error.name);
    console.error("[EMAIL API] Stack:", error.stack);
    console.error("[EMAIL API] ========================================");
    
    // Asegurar que siempre devolvemos JSON válido
    const errorResponse = {
      error: error.message || "Error interno del servidor",
      details: error.name || "Error desconocido",
      timestamp: new Date().toISOString()
    };
    
    return new Response(
      JSON.stringify(errorResponse),
      { 
        status: 500, 
        headers: { 
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*"
        } 
      }
    );
  }
};

