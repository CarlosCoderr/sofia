import { eq } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { scoped } from "@/lib/db/tenant";
import { SalonError } from "@/server/business/http";

/**
 * Módulo SALON — comprobar que lo que llega de un formulario existe en ESTA
 * organización antes de guardarlo: un id ajeno o borrado se rechaza con un mensaje
 * claro en vez de guardar una referencia rota (o, peor, la de otro negocio).
 */

export type Tx = Pick<ReturnType<typeof getDb>, "select">;

/** La imagen debe estar en la biblioteca de la organización y ser una imagen. */
export async function assertImageOwned(
  tx: Tx,
  organizationId: string,
  imageMediaId: string | null | undefined
): Promise<void> {
  if (!imageMediaId) return;
  const [media] = await tx
    .select({ kind: schema.mediaLibraryItem.kind })
    .from(schema.mediaLibraryItem)
    .where(
      scoped(
        schema.mediaLibraryItem.organizationId,
        organizationId,
        eq(schema.mediaLibraryItem.id, imageMediaId)
      )
    )
    .limit(1);
  if (!media) {
    throw new SalonError(
      "image_not_found",
      422,
      "La imagen elegida ya no está en la biblioteca. Elige otra."
    );
  }
  if (media.kind !== "image") {
    throw new SalonError("image_invalid", 422, "Elige una imagen, no un video.");
  }
}
