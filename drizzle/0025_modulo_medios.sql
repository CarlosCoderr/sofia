CREATE TABLE "media_library_item" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"name" text NOT NULL,
	"kind" text NOT NULL,
	"mime_type" text NOT NULL,
	"size_bytes" integer NOT NULL,
	"source" text NOT NULL,
	"source_url" text,
	"created_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "media_library_item_size_pos" CHECK ("media_library_item"."size_bytes" > 0)
);
--> statement-breakpoint
ALTER TABLE "media_library_item" ADD CONSTRAINT "media_library_item_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "media_library_item_org_idx" ON "media_library_item" USING btree ("organization_id","created_at");