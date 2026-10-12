CREATE TABLE "buyers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"organization_name" text NOT NULL,
	"business_type" text,
	"contact_person" text,
	"phone" text,
	"email" text,
	"region" text,
	"zone" text,
	"district" text,
	"address" text,
	"category" text,
	"verification_status" text DEFAULT 'pending' NOT NULL,
	"review_note" text,
	"reviewed_by_user_id" text,
	"reviewed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "transporters" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"company_name" text NOT NULL,
	"contact_name" text,
	"phone" text,
	"email" text,
	"region" text,
	"vehicle_type" text,
	"vehicle_plate" text,
	"capacity" text,
	"driver_name" text,
	"verification_status" text DEFAULT 'pending' NOT NULL,
	"review_note" text,
	"reviewed_by_user_id" text,
	"reviewed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "cooperatives" ADD COLUMN "verification_status" text DEFAULT 'pending' NOT NULL;--> statement-breakpoint
ALTER TABLE "cooperatives" ADD COLUMN "review_note" text;--> statement-breakpoint
ALTER TABLE "cooperatives" ADD COLUMN "submitted_by_user_id" text;--> statement-breakpoint
ALTER TABLE "cooperatives" ADD COLUMN "reviewed_by_user_id" text;--> statement-breakpoint
ALTER TABLE "cooperatives" ADD COLUMN "reviewed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "buyers" ADD CONSTRAINT "buyers_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "buyers" ADD CONSTRAINT "buyers_reviewed_by_user_id_user_id_fk" FOREIGN KEY ("reviewed_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transporters" ADD CONSTRAINT "transporters_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transporters" ADD CONSTRAINT "transporters_reviewed_by_user_id_user_id_fk" FOREIGN KEY ("reviewed_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "buyers_user_unique" ON "buyers" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "buyers_verification_status_idx" ON "buyers" USING btree ("verification_status");--> statement-breakpoint
CREATE INDEX "buyers_deleted_at_idx" ON "buyers" USING btree ("deleted_at");--> statement-breakpoint
CREATE UNIQUE INDEX "transporters_user_unique" ON "transporters" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "transporters_verification_status_idx" ON "transporters" USING btree ("verification_status");--> statement-breakpoint
CREATE INDEX "transporters_deleted_at_idx" ON "transporters" USING btree ("deleted_at");--> statement-breakpoint
ALTER TABLE "cooperatives" ADD CONSTRAINT "cooperatives_submitted_by_user_id_user_id_fk" FOREIGN KEY ("submitted_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cooperatives" ADD CONSTRAINT "cooperatives_reviewed_by_user_id_user_id_fk" FOREIGN KEY ("reviewed_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "cooperatives_verification_status_idx" ON "cooperatives" USING btree ("verification_status");--> statement-breakpoint
UPDATE "cooperatives" SET "verification_status" = 'approved' WHERE "deleted_at" IS NULL;