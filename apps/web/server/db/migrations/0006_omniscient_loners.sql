CREATE TABLE "shipments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"cooperative_id" uuid NOT NULL,
	"transporter_id" uuid,
	"transporter_user_id" text,
	"transporter_kind" text DEFAULT 'external' NOT NULL,
	"transporter_name" text NOT NULL,
	"transporter_phone" text,
	"vehicle_type" text,
	"vehicle_plate" text,
	"driver_name" text,
	"pickup_location" text NOT NULL,
	"destination" text NOT NULL,
	"transport_cost" numeric(14, 3),
	"status" text DEFAULT 'TRANSPORT_PENDING' NOT NULL,
	"scheduled_pickup_at" timestamp with time zone,
	"expected_delivery_at" timestamp with time zone,
	"coop_pickup_confirmed_at" timestamp with time zone,
	"transporter_pickup_confirmed_at" timestamp with time zone,
	"dispatched_at" timestamp with time zone,
	"delivered_at" timestamp with time zone,
	"delivery_confirmed_at" timestamp with time zone,
	"delivery_received_quantity" numeric(14, 3),
	"delivery_condition" text,
	"delivery_notes" text,
	"cancel_reason" text,
	"created_by_user_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "shipments_order_id_unique" UNIQUE("order_id")
);
--> statement-breakpoint
ALTER TABLE "shipments" ADD CONSTRAINT "shipments_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shipments" ADD CONSTRAINT "shipments_cooperative_id_cooperatives_id_fk" FOREIGN KEY ("cooperative_id") REFERENCES "public"."cooperatives"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shipments" ADD CONSTRAINT "shipments_transporter_id_transporters_id_fk" FOREIGN KEY ("transporter_id") REFERENCES "public"."transporters"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shipments" ADD CONSTRAINT "shipments_transporter_user_id_user_id_fk" FOREIGN KEY ("transporter_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shipments" ADD CONSTRAINT "shipments_created_by_user_id_user_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "shipments_cooperative_idx" ON "shipments" USING btree ("cooperative_id");--> statement-breakpoint
CREATE INDEX "shipments_transporter_user_idx" ON "shipments" USING btree ("transporter_user_id");--> statement-breakpoint
CREATE INDEX "shipments_status_idx" ON "shipments" USING btree ("status");