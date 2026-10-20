import { getDb } from "@/lib/db";
import { contact } from "@/lib/db/schema";
import { scoped } from "@/lib/db/tenant";
import { eq, sql } from "drizzle-orm";

/**
 * Proceso diario (cron): Busca contactos que cumplan años hoy y dispara el saludo.
 */
export async function processBirthdayReminders(organizationId: string) {
  const db = getDb();
  
  // Obtener la fecha actual en formato MM-DD (asumiendo que guardas birthDate como "YYYY-MM-DD" o similar)
  const todayStr = new Date().toISOString().slice(5, 10); // "MM-DD"

  // Consultar contactos cuyo cumpleaños coincida hoy
  const birthdayContacts = await db
    .select()
    .from(contact)
    .where(
      scoped(
        contact.organizationId,
        organizationId,
        sql`to_char(birth_date::date, 'MM-DD') = ${todayStr}`
      )
    );

  const results = [];

  for (const c of birthdayContacts) {
    if (!c.phone && !c.waIdentity) continue;

    // Mensaje personalizado de cumpleaños
    const mensajeCumple = `¡Hola ${c.name}! 🎉 De parte de todo el equipo te deseamos un muy feliz cumpleaños. Queremos celebrarte regalándote un 20% de descuento en tu próximo corte o servicio en nuestra barbería este mes. ¡Te esperamos! 💈`;

    // Aquí invocas tu función nativa de envío de WhatsApp de Vocero CRM
    // Ejemplo: await sendWhatsAppMessage({ organizationId, to: c.waIdentity, text: mensajeCumple });

    results.push({
      contactId: c.id,
      name: c.name,
      message: mensajeCumple,
      status: "pendiente_envio",
    });
  }

  return {
    success: true,
    saludosPendientes: results.length,
    details: results,
  };
}

/**
 * Dispara el mensaje post-servicio pidiendo la reseña en Google Maps.
 */
export async function sendGoogleReviewPrompt(input: {
  organizationId: string;
  contactId: string;
  googleMapsReviewUrl: string;
}) {
  const db = getDb();

  const [c] = await db
    .select()
    .from(contact)
    .where(scoped(contact.organizationId, input.organizationId, eq(contact.id, input.contactId)))
    .limit(1);

  if (!c || (!c.phone && !c.waIdentity)) {
    return { success: false, error: "Contacto no encontrado o sin identificador de WhatsApp." };
  }

  const mensajeReseña = `¡Hola ${c.name}! ✂️ Gracias por visitarnos hoy. Queremos saber qué tal te pareció la atención. ¿Nos regalarías 1 minuto para dejarnos tu reseña aquí? Nos ayudas muchísimo: ${input.googleMapsReviewUrl}`;

  // Integración con el emisor de mensajes de Vocero CRM
  // await sendWhatsAppMessage({ organizationId: input.organizationId, to: c.waIdentity, text: mensajeReseña });

  return {
    success: true,
    message: mensajeReseña,
    status: "pendiente_envio" as const,
  };
}