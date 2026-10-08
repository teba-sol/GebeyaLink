CREATE TABLE "collection_centers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"cooperative_id" uuid NOT NULL,
	"name" text NOT NULL,
	"location" text,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "farmer_deliveries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"cooperative_id" uuid NOT NULL,
	"collection_center_id" uuid NOT NULL,
	"farmer_id" uuid NOT NULL,
	"product_id" text NOT NULL,
	"recorded_by_id" text,
	"claimed_quantity" numeric(14, 3) NOT NULL,
	"measured_quantity" numeric(14, 3) NOT NULL,
	"accepted_quantity" numeric(14, 3) NOT NULL,
	"rejected_quantity" numeric(14, 3) NOT NULL,
	"quality_grade" text NOT NULL,
	"status" text DEFAULT 'RECEIVED' NOT NULL,
	"delivery_date" timestamp with time zone DEFAULT now() NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "inventory_lot_sources" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lot_id" uuid NOT NULL,
	"delivery_id" uuid NOT NULL,
	"accepted_quantity" numeric(14, 3) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "inventory_lots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"cooperative_id" uuid NOT NULL,
	"collection_center_id" uuid NOT NULL,
	"product_id" text NOT NULL,
	"quality_grade" text NOT NULL,
	"total_quantity" numeric(14, 3) DEFAULT 0 NOT NULL,
	"available_quantity" numeric(14, 3) DEFAULT 0 NOT NULL,
	"status" text DEFAULT 'AVAILABLE' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "collection_centers" ADD CONSTRAINT "collection_centers_cooperative_id_cooperatives_id_fk" FOREIGN KEY ("cooperative_id") REFERENCES "public"."cooperatives"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "farmer_deliveries" ADD CONSTRAINT "farmer_deliveries_cooperative_id_cooperatives_id_fk" FOREIGN KEY ("cooperative_id") REFERENCES "public"."cooperatives"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "farmer_deliveries" ADD CONSTRAINT "farmer_deliveries_collection_center_id_collection_centers_id_fk" FOREIGN KEY ("collection_center_id") REFERENCES "public"."collection_centers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "farmer_deliveries" ADD CONSTRAINT "farmer_deliveries_farmer_id_farmers_id_fk" FOREIGN KEY ("farmer_id") REFERENCES "public"."farmers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "farmer_deliveries" ADD CONSTRAINT "farmer_deliveries_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "farmer_deliveries" ADD CONSTRAINT "farmer_deliveries_recorded_by_id_user_id_fk" FOREIGN KEY ("recorded_by_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_lot_sources" ADD CONSTRAINT "inventory_lot_sources_lot_id_inventory_lots_id_fk" FOREIGN KEY ("lot_id") REFERENCES "public"."inventory_lots"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_lot_sources" ADD CONSTRAINT "inventory_lot_sources_delivery_id_farmer_deliveries_id_fk" FOREIGN KEY ("delivery_id") REFERENCES "public"."farmer_deliveries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_lots" ADD CONSTRAINT "inventory_lots_cooperative_id_cooperatives_id_fk" FOREIGN KEY ("cooperative_id") REFERENCES "public"."cooperatives"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_lots" ADD CONSTRAINT "inventory_lots_collection_center_id_collection_centers_id_fk" FOREIGN KEY ("collection_center_id") REFERENCES "public"."collection_centers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_lots" ADD CONSTRAINT "inventory_lots_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "collection_centers_coop_name_unique" ON "collection_centers" USING btree ("cooperative_id","name");--> statement-breakpoint
CREATE INDEX "collection_centers_cooperative_idx" ON "collection_centers" USING btree ("cooperative_id");--> statement-breakpoint
CREATE INDEX "farmer_deliveries_cooperative_idx" ON "farmer_deliveries" USING btree ("cooperative_id");--> statement-breakpoint
CREATE INDEX "farmer_deliveries_center_idx" ON "farmer_deliveries" USING btree ("collection_center_id");--> statement-breakpoint
CREATE INDEX "farmer_deliveries_farmer_idx" ON "farmer_deliveries" USING btree ("farmer_id");--> statement-breakpoint
CREATE INDEX "farmer_deliveries_product_idx" ON "farmer_deliveries" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "farmer_deliveries_status_idx" ON "farmer_deliveries" USING btree ("status");--> statement-breakpoint
CREATE INDEX "farmer_deliveries_recorded_by_idx" ON "farmer_deliveries" USING btree ("recorded_by_id");--> statement-breakpoint
CREATE UNIQUE INDEX "inventory_lot_sources_lot_delivery_unique" ON "inventory_lot_sources" USING btree ("lot_id","delivery_id");--> statement-breakpoint
CREATE INDEX "inventory_lot_sources_delivery_idx" ON "inventory_lot_sources" USING btree ("delivery_id");--> statement-breakpoint
CREATE UNIQUE INDEX "inventory_lots_identity_unique" ON "inventory_lots" USING btree ("cooperative_id","product_id","quality_grade","collection_center_id");--> statement-breakpoint
CREATE INDEX "inventory_lots_cooperative_idx" ON "inventory_lots" USING btree ("cooperative_id");--> statement-breakpoint
CREATE INDEX "inventory_lots_product_idx" ON "inventory_lots" USING btree ("product_id");--> statement-breakpoint
CREATE UNIQUE INDEX "products_slug_unique" ON "products" USING btree ("slug");
--> statement-breakpoint
INSERT INTO "products" ("id", "name", "slug") VALUES
	('maize', 'Maize', 'maize'),
	('wheat', 'Wheat', 'wheat'),
	('coffee', 'Coffee', 'coffee'),
	('sesame', 'Sesame', 'sesame'),
	('teff', 'Teff', 'teff'),
	('sorghum', 'Sorghum', 'sorghum');