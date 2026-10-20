ALTER TABLE "contact" ADD COLUMN "salon_client" boolean DEFAULT false NOT NULL;
--> statement-breakpoint
UPDATE "contact" SET "salon_client" = true WHERE "id" IN (SELECT "contact_id" FROM "service_sale" WHERE "contact_id" IS NOT NULL);
