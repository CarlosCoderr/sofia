CREATE TABLE "combo" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"price_cents" integer NOT NULL,
	"duration_minutes" integer DEFAULT 60 NOT NULL,
	"keyword_trigger" text,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "combo_price_nonneg" CHECK ("combo"."price_cents" >= 0),
	CONSTRAINT "combo_duration_pos" CHECK ("combo"."duration_minutes" > 0)
);
--> statement-breakpoint
CREATE TABLE "service" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"price_cents" integer NOT NULL,
	"duration_minutes" integer DEFAULT 30 NOT NULL,
	"photo_url" text,
	"default_commission_percentage" integer DEFAULT 50,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "service_price_nonneg" CHECK ("service"."price_cents" >= 0),
	CONSTRAINT "service_duration_pos" CHECK ("service"."duration_minutes" > 0),
	CONSTRAINT "service_commission_pct" CHECK ("service"."default_commission_percentage" is null or "service"."default_commission_percentage" between 0 and 100)
);
--> statement-breakpoint
CREATE TABLE "service_sale" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"booking_id" text,
	"contact_id" text,
	"customer_name" text NOT NULL,
	"staff_id" text NOT NULL,
	"service_id" text,
	"combo_id" text,
	"amount_cents" integer NOT NULL,
	"staff_commission_cents" integer NOT NULL,
	"business_net_cents" integer NOT NULL,
	"payment_method" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "service_sale_amount_nonneg" CHECK ("service_sale"."amount_cents" >= 0),
	CONSTRAINT "service_sale_split" CHECK ("service_sale"."staff_commission_cents" + "service_sale"."business_net_cents" = "service_sale"."amount_cents"),
	CONSTRAINT "service_sale_one_item" CHECK (num_nonnulls("service_sale"."service_id", "service_sale"."combo_id") = 1)
);
--> statement-breakpoint
CREATE TABLE "staff" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"name" text NOT NULL,
	"phone" text,
	"active" boolean DEFAULT true NOT NULL,
	"global_commission_percentage" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "staff_commission_pct" CHECK ("staff"."global_commission_percentage" is null or "staff"."global_commission_percentage" between 0 and 100)
);
--> statement-breakpoint
CREATE TABLE "staff_schedule" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"staff_id" text NOT NULL,
	"day_of_week" integer NOT NULL,
	"start_time" text NOT NULL,
	"end_time" text NOT NULL,
	"is_off" boolean DEFAULT false NOT NULL,
	CONSTRAINT "staff_schedule_day" CHECK ("staff_schedule"."day_of_week" between 0 and 6)
);
--> statement-breakpoint
CREATE TABLE "staff_service_commission" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"staff_id" text NOT NULL,
	"service_id" text NOT NULL,
	"percentage" integer NOT NULL,
	CONSTRAINT "staff_service_commission_pct" CHECK ("staff_service_commission"."percentage" between 0 and 100)
);
--> statement-breakpoint
DROP INDEX "booking_org_active_slot_uq";--> statement-breakpoint
ALTER TABLE "booking" ADD COLUMN "staff_id" text;--> statement-breakpoint
ALTER TABLE "combo" ADD CONSTRAINT "combo_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service" ADD CONSTRAINT "service_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_sale" ADD CONSTRAINT "service_sale_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_sale" ADD CONSTRAINT "service_sale_booking_id_booking_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."booking"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_sale" ADD CONSTRAINT "service_sale_contact_id_contact_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contact"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_sale" ADD CONSTRAINT "service_sale_staff_id_staff_id_fk" FOREIGN KEY ("staff_id") REFERENCES "public"."staff"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_sale" ADD CONSTRAINT "service_sale_service_id_service_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."service"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_sale" ADD CONSTRAINT "service_sale_combo_id_combo_id_fk" FOREIGN KEY ("combo_id") REFERENCES "public"."combo"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff" ADD CONSTRAINT "staff_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff_schedule" ADD CONSTRAINT "staff_schedule_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff_schedule" ADD CONSTRAINT "staff_schedule_staff_id_staff_id_fk" FOREIGN KEY ("staff_id") REFERENCES "public"."staff"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff_service_commission" ADD CONSTRAINT "staff_service_commission_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff_service_commission" ADD CONSTRAINT "staff_service_commission_staff_id_staff_id_fk" FOREIGN KEY ("staff_id") REFERENCES "public"."staff"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff_service_commission" ADD CONSTRAINT "staff_service_commission_service_id_service_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."service"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "combo_org_idx" ON "combo" USING btree ("organization_id","active");--> statement-breakpoint
CREATE UNIQUE INDEX "combo_org_keyword_uq" ON "combo" USING btree ("organization_id","keyword_trigger") WHERE "combo"."keyword_trigger" is not null;--> statement-breakpoint
CREATE INDEX "service_org_idx" ON "service" USING btree ("organization_id","active");--> statement-breakpoint
CREATE INDEX "service_sale_org_when_idx" ON "service_sale" USING btree ("organization_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "service_sale_booking_uq" ON "service_sale" USING btree ("booking_id") WHERE "service_sale"."booking_id" is not null;--> statement-breakpoint
CREATE INDEX "service_sale_org_staff_idx" ON "service_sale" USING btree ("organization_id","staff_id","created_at");--> statement-breakpoint
CREATE INDEX "staff_org_idx" ON "staff" USING btree ("organization_id","active");--> statement-breakpoint
CREATE UNIQUE INDEX "staff_schedule_staff_day_uq" ON "staff_schedule" USING btree ("staff_id","day_of_week");--> statement-breakpoint
CREATE INDEX "staff_schedule_org_idx" ON "staff_schedule" USING btree ("organization_id");--> statement-breakpoint
CREATE UNIQUE INDEX "staff_service_commission_uq" ON "staff_service_commission" USING btree ("staff_id","service_id");--> statement-breakpoint
CREATE INDEX "staff_service_commission_org_idx" ON "staff_service_commission" USING btree ("organization_id");--> statement-breakpoint
ALTER TABLE "booking" ADD CONSTRAINT "booking_staff_id_staff_id_fk" FOREIGN KEY ("staff_id") REFERENCES "public"."staff"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "booking_org_staff_idx" ON "booking" USING btree ("organization_id","staff_id","scheduled_at");--> statement-breakpoint
CREATE UNIQUE INDEX "booking_org_active_slot_uq" ON "booking" USING btree ("organization_id","scheduled_at",coalesce("staff_id", '')) WHERE "booking"."status" in ('agendada','realizada') and "booking"."is_test" = false;