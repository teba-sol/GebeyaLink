CREATE TABLE "farmers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"cooperative_id" uuid NOT NULL,
	"name" text NOT NULL,
	"phone" text,
	"location" text,
	"active" boolean DEFAULT true NOT NULL,
	"registered_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "farmers" ADD CONSTRAINT "farmers_cooperative_id_cooperatives_id_fk" FOREIGN KEY ("cooperative_id") REFERENCES "public"."cooperatives"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "farmers_coop_phone_unique" ON "farmers" USING btree ("cooperative_id","phone") WHERE "phone" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "farmers_cooperative_idx" ON "farmers" USING btree ("cooperative_id");--> statement-breakpoint
CREATE INDEX "farmers_deleted_at_idx" ON "farmers" USING btree ("deleted_at");