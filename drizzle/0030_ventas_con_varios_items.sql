CREATE TABLE "service_sale_item" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"sale_id" text NOT NULL,
	"service_id" text,
	"combo_id" text,
	"amount_cents" integer NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "service_sale_item_amount_nonneg" CHECK ("service_sale_item"."amount_cents" >= 0),
	CONSTRAINT "service_sale_item_one" CHECK (num_nonnulls("service_sale_item"."service_id", "service_sale_item"."combo_id") = 1)
);
--> statement-breakpoint
ALTER TABLE "service_sale_item" ADD CONSTRAINT "service_sale_item_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_sale_item" ADD CONSTRAINT "service_sale_item_sale_id_service_sale_id_fk" FOREIGN KEY ("sale_id") REFERENCES "public"."service_sale"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_sale_item" ADD CONSTRAINT "service_sale_item_service_id_service_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."service"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_sale_item" ADD CONSTRAINT "service_sale_item_combo_id_combo_id_fk" FOREIGN KEY ("combo_id") REFERENCES "public"."combo"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "service_sale_item_org_idx" ON "service_sale_item" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "service_sale_item_sale_idx" ON "service_sale_item" USING btree ("sale_id");--> statement-breakpoint
-- Yape y Plin pasan a un solo método.
UPDATE "service_sale" SET "payment_method" = 'yape_plin' WHERE "payment_method" IN ('yape', 'plin');--> statement-breakpoint
-- Cada venta que ya existía queda con su único ítem (mismo servicio u oferta y mismo monto).
INSERT INTO "service_sale_item" ("id", "organization_id", "sale_id", "service_id", "combo_id", "amount_cents", "position") SELECT 'sli_' || substr(md5("id" || 'item'), 1, 20), "organization_id", "id", "service_id", "combo_id", "amount_cents", 0 FROM "service_sale";
