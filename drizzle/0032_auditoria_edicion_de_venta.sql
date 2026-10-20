CREATE TABLE "service_sale_edit" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"sale_id" text NOT NULL,
	"changed_at" timestamp DEFAULT now() NOT NULL,
	"changed_by_user_id" text NOT NULL,
	"changed_by_label" text NOT NULL,
	"before" jsonb NOT NULL,
	"after" jsonb NOT NULL
);
--> statement-breakpoint
ALTER TABLE "service_sale_edit" ADD CONSTRAINT "service_sale_edit_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "service_sale_edit_org_idx" ON "service_sale_edit" USING btree ("organization_id","changed_at");--> statement-breakpoint
CREATE INDEX "service_sale_edit_sale_idx" ON "service_sale_edit" USING btree ("sale_id");