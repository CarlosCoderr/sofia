CREATE TABLE "staff_allowed_service" (
	"organization_id" text NOT NULL,
	"staff_id" text NOT NULL,
	"service_id" text NOT NULL,
	CONSTRAINT "staff_allowed_service_staff_id_service_id_pk" PRIMARY KEY("staff_id","service_id")
);
--> statement-breakpoint
ALTER TABLE "staff" ADD COLUMN "image_media_id" text;--> statement-breakpoint
ALTER TABLE "staff_allowed_service" ADD CONSTRAINT "staff_allowed_service_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff_allowed_service" ADD CONSTRAINT "staff_allowed_service_staff_id_staff_id_fk" FOREIGN KEY ("staff_id") REFERENCES "public"."staff"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff_allowed_service" ADD CONSTRAINT "staff_allowed_service_service_id_service_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."service"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "staff_allowed_service_org_idx" ON "staff_allowed_service" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "staff_allowed_service_service_idx" ON "staff_allowed_service" USING btree ("service_id");--> statement-breakpoint
ALTER TABLE "staff" ADD CONSTRAINT "staff_image_media_id_media_library_item_id_fk" FOREIGN KEY ("image_media_id") REFERENCES "public"."media_library_item"("id") ON DELETE set null ON UPDATE no action;