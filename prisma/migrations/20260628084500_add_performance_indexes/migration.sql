-- Performance indexes for high-traffic dashboard, table, search, and scan flows.
-- These are intentionally targeted at existing query patterns in the application.

CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Users / permissions / audit
CREATE INDEX IF NOT EXISTS "users_role_status_idx" ON "users" ("role", "status");
CREATE INDEX IF NOT EXISTS "users_staff_role_id_status_idx" ON "users" ("staff_role_id", "status");
CREATE INDEX IF NOT EXISTS "users_created_at_idx" ON "users" ("created_at");
CREATE INDEX IF NOT EXISTS "staff_roles_active_is_admin_idx" ON "staff_roles" ("active", "is_admin");
CREATE INDEX IF NOT EXISTS "audit_logs_module_created_at_idx" ON "audit_logs" ("module", "created_at");
CREATE INDEX IF NOT EXISTS "audit_logs_action_created_at_idx" ON "audit_logs" ("action", "created_at");

-- Agent / affiliate dashboards
CREATE INDEX IF NOT EXISTS "agents_status_created_at_idx" ON "agents" ("status", "created_at");
CREATE INDEX IF NOT EXISTS "agents_email_idx" ON "agents" ("email");
CREATE INDEX IF NOT EXISTS "agents_phone_idx" ON "agents" ("phone");
CREATE INDEX IF NOT EXISTS "agent_commissions_agent_id_status_idx" ON "agent_commissions" ("agent_id", "status");
CREATE INDEX IF NOT EXISTS "agent_commissions_status_created_at_idx" ON "agent_commissions" ("status", "created_at");
CREATE INDEX IF NOT EXISTS "affiliates_status_created_at_idx" ON "affiliates" ("status", "created_at");
CREATE INDEX IF NOT EXISTS "affiliates_email_idx" ON "affiliates" ("email");
CREATE INDEX IF NOT EXISTS "affiliates_phone_idx" ON "affiliates" ("phone");
CREATE INDEX IF NOT EXISTS "affiliate_links_affiliate_id_active_idx" ON "affiliate_links" ("affiliate_id", "active");
CREATE INDEX IF NOT EXISTS "affiliate_coupons_affiliate_id_status_idx" ON "affiliate_coupons" ("affiliate_id", "status");
CREATE INDEX IF NOT EXISTS "affiliate_coupons_status_created_at_idx" ON "affiliate_coupons" ("status", "created_at");
CREATE INDEX IF NOT EXISTS "affiliate_clicks_session_id_idx" ON "affiliate_clicks" ("session_id");
CREATE INDEX IF NOT EXISTS "affiliate_clicks_converted_at_idx" ON "affiliate_clicks" ("converted_at");
CREATE INDEX IF NOT EXISTS "affiliate_commissions_affiliate_id_status_idx" ON "affiliate_commissions" ("affiliate_id", "status");
CREATE INDEX IF NOT EXISTS "affiliate_commissions_status_created_at_idx" ON "affiliate_commissions" ("status", "created_at");

-- Customers, catalog, slots
CREATE INDEX IF NOT EXISTS "customers_source_created_at_idx" ON "customers" ("source", "created_at");
CREATE INDEX IF NOT EXISTS "customers_phone_idx" ON "customers" ("phone");
CREATE INDEX IF NOT EXISTS "customers_email_idx" ON "customers" ("email");
CREATE INDEX IF NOT EXISTS "customers_created_at_idx" ON "customers" ("created_at");
CREATE INDEX IF NOT EXISTS "packages_active_display_order_idx" ON "packages" ("active", "display_order");
CREATE INDEX IF NOT EXISTS "packages_activity_id_active_idx" ON "packages" ("activity_id", "active");
CREATE INDEX IF NOT EXISTS "add_ons_active_display_order_idx" ON "add_ons" ("active", "display_order");
CREATE INDEX IF NOT EXISTS "add_ons_activity_id_active_idx" ON "add_ons" ("activity_id", "active");
CREATE INDEX IF NOT EXISTS "time_slots_date_status_idx" ON "time_slots" ("date", "status");
CREATE INDEX IF NOT EXISTS "time_slots_activity_id_date_status_idx" ON "time_slots" ("activity_id", "date", "status");

-- Booking lists, dashboard filters, revenue summaries
CREATE INDEX IF NOT EXISTS "bookings_booking_date_booking_status_idx" ON "bookings" ("booking_date", "booking_status");
CREATE INDEX IF NOT EXISTS "bookings_booking_date_payment_status_idx" ON "bookings" ("booking_date", "payment_status");
CREATE INDEX IF NOT EXISTS "bookings_source_payment_status_created_at_idx" ON "bookings" ("source", "payment_status", "created_at");
CREATE INDEX IF NOT EXISTS "bookings_currency_payment_status_created_at_idx" ON "bookings" ("currency", "payment_status", "created_at");
CREATE INDEX IF NOT EXISTS "bookings_payment_status_created_at_idx" ON "bookings" ("payment_status", "created_at");
CREATE INDEX IF NOT EXISTS "bookings_media_status_created_at_idx" ON "bookings" ("media_status", "created_at");
CREATE INDEX IF NOT EXISTS "bookings_waiver_status_booking_date_idx" ON "bookings" ("waiver_status", "booking_date");
CREATE INDEX IF NOT EXISTS "bookings_created_at_idx" ON "bookings" ("created_at");
CREATE INDEX IF NOT EXISTS "booking_riders_rider_id_idx" ON "booking_riders" ("rider_id");
CREATE INDEX IF NOT EXISTS "booking_add_ons_add_on_id_idx" ON "booking_add_ons" ("add_on_id");
CREATE INDEX IF NOT EXISTS "payments_status_created_at_idx" ON "payments" ("status", "created_at");
CREATE INDEX IF NOT EXISTS "payments_currency_status_created_at_idx" ON "payments" ("currency", "status", "created_at");
CREATE INDEX IF NOT EXISTS "payments_method_status_idx" ON "payments" ("method", "status");
CREATE INDEX IF NOT EXISTS "refunds_payment_id_idx" ON "refunds" ("payment_id");
CREATE INDEX IF NOT EXISTS "refunds_status_created_at_idx" ON "refunds" ("status", "created_at");
CREATE INDEX IF NOT EXISTS "check_ins_checked_in_at_idx" ON "check_ins" ("checked_in_at");
CREATE INDEX IF NOT EXISTS "check_ins_checked_in_by_idx" ON "check_ins" ("checked_in_by");

-- Waiver and wristband flows
CREATE INDEX IF NOT EXISTS "waivers_booking_id_status_idx" ON "waivers" ("booking_id", "status");
CREATE INDEX IF NOT EXISTS "waivers_status_created_at_idx" ON "waivers" ("status", "created_at");
CREATE INDEX IF NOT EXISTS "waivers_phone_number_idx" ON "waivers" ("phone_number");
CREATE INDEX IF NOT EXISTS "qr_wristbands_status_linked_at_idx" ON "qr_wristbands" ("status", "linked_at");
CREATE INDEX IF NOT EXISTS "qr_wristbands_current_booking_id_idx" ON "qr_wristbands" ("current_booking_id");
CREATE INDEX IF NOT EXISTS "qr_wristbands_current_rider_id_idx" ON "qr_wristbands" ("current_rider_id");
CREATE INDEX IF NOT EXISTS "qr_wristbands_released_at_idx" ON "qr_wristbands" ("released_at");
CREATE INDEX IF NOT EXISTS "ride_tracking_ride_date_status_idx" ON "ride_tracking" ("ride_date", "status");
CREATE INDEX IF NOT EXISTS "ride_tracking_booking_id_status_idx" ON "ride_tracking" ("booking_id", "status");
CREATE INDEX IF NOT EXISTS "scan_events_scan_location_scan_time_idx" ON "scan_events" ("scan_location", "scan_time");
CREATE INDEX IF NOT EXISTS "scan_events_wristband_qr_id_idx" ON "scan_events" ("wristband_qr_id");

-- Media delivery and website media
CREATE INDEX IF NOT EXISTS "website_media_active_display_order_idx" ON "website_media" ("active", "display_order");
CREATE INDEX IF NOT EXISTS "website_media_frontend_location_active_idx" ON "website_media" ("frontend_location", "active");
CREATE INDEX IF NOT EXISTS "website_media_created_at_idx" ON "website_media" ("created_at");
CREATE INDEX IF NOT EXISTS "customer_media_delivery_delivery_status_created_at_idx" ON "customer_media_delivery" ("delivery_status", "created_at");
CREATE INDEX IF NOT EXISTS "customer_media_delivery_assigned_to_delivery_status_idx" ON "customer_media_delivery" ("assigned_to", "delivery_status");

-- Trigram indexes for existing contains/insensitive search filters.
CREATE INDEX IF NOT EXISTS "bookings_reference_trgm_idx" ON "bookings" USING GIN ("reference" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "customers_name_trgm_idx" ON "customers" USING GIN ("name" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "customers_phone_trgm_idx" ON "customers" USING GIN ("phone" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "customers_email_trgm_idx" ON "customers" USING GIN ("email" gin_trgm_ops);
