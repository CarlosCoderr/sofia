CREATE TABLE "combo_staff" (
	"organization_id" text NOT NULL,
	"combo_id" text NOT NULL,
	"staff_id" text NOT NULL,
	CONSTRAINT "combo_staff_combo_id_staff_id_pk" PRIMARY KEY("combo_id","staff_id")
);
--> statement-breakpoint
CREATE TABLE "service_staff" (
	"organization_id" text NOT NULL,
	"service_id" text NOT NULL,
	"staff_id" text NOT NULL,
	CONSTRAINT "service_staff_service_id_staff_id_pk" PRIMARY KEY("service_id","staff_id")
);
--> statement-breakpoint
ALTER TABLE "combo" ADD COLUMN "image_media_id" text;--> statement-breakpoint
ALTER TABLE "service" ADD COLUMN "image_media_id" text;--> statement-breakpoint
ALTER TABLE "combo_staff" ADD CONSTRAINT "combo_staff_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "combo_staff" ADD CONSTRAINT "combo_staff_combo_id_combo_id_fk" FOREIGN KEY ("combo_id") REFERENCES "public"."combo"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "combo_staff" ADD CONSTRAINT "combo_staff_staff_id_staff_id_fk" FOREIGN KEY ("staff_id") REFERENCES "public"."staff"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_staff" ADD CONSTRAINT "service_staff_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_staff" ADD CONSTRAINT "service_staff_service_id_service_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."service"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_staff" ADD CONSTRAINT "service_staff_staff_id_staff_id_fk" FOREIGN KEY ("staff_id") REFERENCES "public"."staff"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "combo_staff_org_idx" ON "combo_staff" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "combo_staff_staff_idx" ON "combo_staff" USING btree ("staff_id");--> statement-breakpoint
CREATE INDEX "service_staff_org_idx" ON "service_staff" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "service_staff_staff_idx" ON "service_staff" USING btree ("staff_id");--> statement-breakpoint
ALTER TABLE "combo" ADD CONSTRAINT "combo_image_media_id_media_library_item_id_fk" FOREIGN KEY ("image_media_id") REFERENCES "public"."media_library_item"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service" ADD CONSTRAINT "service_image_media_id_media_library_item_id_fk" FOREIGN KEY ("image_media_id") REFERENCES "public"."media_library_item"("id") ON DELETE set null ON UPDATE no action;