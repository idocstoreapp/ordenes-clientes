import type { APIRoute } from "astro";
import { Resend } from "resend";
import { getSystemSettings } from "../../lib/settings";

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

    // Cargar configuración del sistema para obtener el logo
    const settings = await getSystemSettings();
    let logoDataUrl = "";
    try {
      // Si el logo es una data URL (base64), usarla directamente
      if (settings.header_logo.url.startsWith("data:")) {
        logoDataUrl = settings.header_logo.url;
      } else {
        // Si es una URL normal, construir la URL completa si es relativa
        let logoUrl = settings.header_logo.url;
        if (!logoUrl.startsWith("http")) {
          // Si es relativa, construir URL completa usando el dominio de producción
          // En producción, usar el dominio real; en desarrollo, usar localhost
          const baseUrl = import.meta.env.PUBLIC_SITE_URL || "https://app.idocstore.cl";
          logoUrl = `${baseUrl}${logoUrl.startsWith("/") ? "" : "/"}${logoUrl}`;
        }
        
        // Intentar cargar y convertir a base64 para mejor compatibilidad con clientes de email
        try {
          const logoResponse = await fetch(logoUrl);
          if (logoResponse.ok) {
            const logoBlob = await logoResponse.blob();
            const logoArrayBuffer = await logoBlob.arrayBuffer();
            const logoBase64 = Buffer.from(logoArrayBuffer).toString('base64');
            const logoMimeType = logoBlob.type || 'image/png';
            logoDataUrl = `data:${logoMimeType};base64,${logoBase64}`;
            console.log("[EMAIL API] Logo cargado y convertido a base64 exitosamente");
          } else {
            console.warn("[EMAIL API] No se pudo cargar el logo, usando URL directamente");
            logoDataUrl = logoUrl;
          }
        } catch (fetchError) {
          console.warn("[EMAIL API] Error cargando logo, usando URL directamente:", fetchError);
          logoDataUrl = logoUrl;
        }
      }
    } catch (error) {
      console.error("[EMAIL API] Error cargando configuración del logo:", error);
      // Continuar sin logo si hay error
    }

    const body = await request.json();
    const { 
      to, 
      customerName, 
      orderNumber, 
      pdfBase64, 
      pdfUrl, // URL del PDF si se subió a storage
      branchName,
      branchEmail, // Ya no se usa, pero se mantiene para compatibilidad
      emailType = 'order_created' // 'order_created' o 'ready_for_pickup'
    } = body;
    
    console.log("[EMAIL API] Datos recibidos:", {
      to: to ? `${to.substring(0, 3)}***` : 'no especificado',
      orderNumber,
      emailType,
      hasPdfBase64: !!pdfBase64,
      hasPdfUrl: !!pdfUrl,
      branchName: branchName || 'no especificado'
    });

    if (!to || !orderNumber) {
      return new Response(
        JSON.stringify({ error: "Faltan datos requeridos: to, orderNumber" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Email de origen: SIEMPRE usar el email del admin (todas las sucursales usan el mismo)
    // IMPORTANTE: El email debe ser del dominio verificado en Resend
    // Todas las sucursales envían desde el mismo correo del admin
    const fromEmail = "info@app.idocstore.cl";
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
      hasPdfBase64: !!pdfBase64,
      hasPdfUrl: !!pdfUrl
    });

    // Determinar contenido del email según el tipo
    let htmlContent = '';
    let subject = '';
    
    if (emailType === 'ready_for_pickup') {
      // Email para cuando el equipo está listo para retirar
      subject = `Notificación: Orden ${orderNumber} - Equipo listo para retirar`;
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
                background-color: #1e3a8a;
                color: white;
                padding: 20px;
                text-align: center;
                border-radius: 5px 5px 0 0;
              }
              .logo-container {
                margin-bottom: 15px;
              }
              .logo-container img {
                max-width: 150px;
                height: auto;
              }
              .content {
                background-color: #f9fafb;
                padding: 30px;
                border-radius: 0 0 5px 5px;
              }
              .order-number {
                background-color: #3b82f6;
                color: white;
                padding: 10px 20px;
                border-radius: 5px;
                display: inline-block;
                margin: 20px 0;
                font-size: 18px;
                font-weight: bold;
              }
              .highlight-box {
                background-color: #dbeafe;
                border-left: 4px solid #3b82f6;
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
                ${logoDataUrl ? `
                  <div class="logo-container">
                    <img src="${logoDataUrl}" alt="iDocStore Logo" />
                  </div>
                ` : ''}
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
      subject = `Notificación: Orden ${orderNumber} - Equipo ingresado`;
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
                background-color: #1e3a8a;
                color: white;
                padding: 20px;
                text-align: center;
                border-radius: 5px 5px 0 0;
              }
              .logo-container {
                margin-bottom: 15px;
              }
              .logo-container img {
                max-width: 150px;
                height: auto;
              }
              .content {
                background-color: #f9fafb;
                padding: 30px;
                border-radius: 0 0 5px 5px;
              }
              .order-number {
                background-color: #3b82f6;
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
                ${logoDataUrl ? `
                  <div class="logo-container">
                    <img src="${logoDataUrl}" alt="iDocStore Logo" />
                  </div>
                ` : ''}
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
                
                ${pdfUrl ? `
                  <p>Puede descargar el PDF con todos los detalles de su orden haciendo clic en el siguiente enlace:</p>
                  <div style="text-align: center; margin: 20px 0;">
                    <a href="${pdfUrl}" style="background-color: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">📄 Descargar PDF de la Orden</a>
                  </div>
                ` : pdfBase64 ? `
                  <p>En el archivo PDF adjunto encontrará todos los detalles de su orden, incluyendo:</p>
                ` : `
                  <p>Su orden ya fue registrada. Si necesita una copia del PDF, puede solicitarla directamente en la sucursal.</p>
                `}
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
      // Headers para que el email llegue a la bandeja principal (no promociones)
      // Importante: NO usar 'Precedence: bulk' ni 'Auto-Submitted' ya que pueden marcar como promocional
      headers: {
        'X-Priority': '1',
        'Importance': 'high',
        'X-Auto-Response-Suppress': 'All',
        // Marcar como transaccional para evitar que vaya a promociones
        'X-Mailer': 'iDocStore-Order-System',
      },
      // Tags para identificar como email transaccional en Resend
      tags: [
        { name: 'transactional', value: 'order-notification' },
        { name: 'order-number', value: orderNumber },
      ],
    };

    // Solo adjuntar PDF si está disponible en base64 (no si tenemos URL)
    // Si tenemos URL, el PDF ya está disponible para descarga y no necesitamos adjuntarlo
    if (pdfBase64 && !pdfUrl && emailType === 'order_created') {
      // Verificar tamaño del base64 (aproximadamente 1.33x el tamaño del archivo)
      const base64Size = pdfBase64.length;
      const maxSize = 4 * 1024 * 1024; // 4MB límite típico para attachments
      
      if (base64Size > maxSize) {
        console.warn("[EMAIL API] PDF demasiado grande para adjuntar, solo se enviará el link si está disponible");
        // No adjuntar si es muy grande
      } else {
        emailData.attachments = [
          {
            filename: `orden-${orderNumber}.pdf`,
            content: pdfBase64,
          },
        ];
      }
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

    // Logging más visible y detallado
    console.log("[EMAIL API] ========================================");
    console.log("[EMAIL API] ✅ EMAIL ENVIADO EXITOSAMENTE");
    console.log("[EMAIL API] Email ID de Resend:", result.data?.id);
    console.log("[EMAIL API] Para:", to ? `${to.substring(0, 3)}***` : 'no especificado');
    console.log("[EMAIL API] Desde:", fromEmail);
    console.log("[EMAIL API] Tipo:", emailType);
    console.log("[EMAIL API] Orden:", orderNumber);
    console.log("[EMAIL API] Timestamp:", new Date().toISOString());
    console.log("[EMAIL API] ========================================");

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Email enviado exitosamente",
        emailId: result.data?.id,
        timestamp: new Date().toISOString()
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

