


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_net" WITH SCHEMA "public";






CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  INSERT INTO public.producers (id, email)
  VALUES (NEW.id, NEW.email);
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."validate_beta_code"("code_input" "text") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    code_record record;
BEGIN
    -- Find the code
    SELECT * INTO code_record
    FROM public.beta_access_codes
    WHERE code = UPPER(TRIM(code_input))
      AND is_active = true;
    
    -- Code not found or inactive
    IF NOT FOUND THEN
        RETURN false;
    END IF;
    
    -- Check if expired
    IF code_record.expires_at IS NOT NULL AND code_record.expires_at < now() THEN
        RETURN false;
    END IF;
    
    -- Check if max uses reached
    IF code_record.max_uses IS NOT NULL AND code_record.current_uses >= code_record.max_uses THEN
        RETURN false;
    END IF;
    
    -- Increment usage count
    UPDATE public.beta_access_codes
    SET current_uses = current_uses + 1
    WHERE id = code_record.id;
    
    RETURN true;
END;
$$;


ALTER FUNCTION "public"."validate_beta_code"("code_input" "text") OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."accounts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "account_name" "text" NOT NULL,
    "slug" "text" NOT NULL,
    "plan_tier" "text" DEFAULT 'free'::"text",
    "venue_name" "text",
    "venue_address" "text",
    "bio_markdown" "text",
    "header_image_url" "text",
    "profile_image_url" "text",
    "instagram" "text",
    "website" "text",
    "discoverable" boolean DEFAULT true,
    "event_window_days" integer DEFAULT 30,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."accounts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."accounts_users" (
    "account_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "role" "text" DEFAULT 'owner'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."accounts_users" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."beta_access_codes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "code" "text" NOT NULL,
    "description" "text",
    "max_uses" integer,
    "current_uses" integer DEFAULT 0,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "expires_at" timestamp with time zone
);


ALTER TABLE "public"."beta_access_codes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."bookings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "event_id" "uuid",
    "slot_position" integer NOT NULL,
    "comic_profile_id" "uuid",
    "guest_name" "text" NOT NULL,
    "guest_email" "text" NOT NULL,
    "guest_instagram" "text",
    "cancel_token" "text" DEFAULT "encode"("extensions"."gen_random_bytes"(16), 'hex'::"text") NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "cancelled_at" timestamp with time zone
);


ALTER TABLE "public"."bookings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."comic_profiles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "email" "text" NOT NULL,
    "name" "text",
    "instagram" "text",
    "password_hash" "text",
    "subscription_tier" "text" DEFAULT 'free'::"text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."comic_profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "producer_id" "uuid",
    "template_id" "uuid",
    "series_id" "uuid",
    "type" "text" DEFAULT 'managed_mic'::"text",
    "is_info_only" boolean DEFAULT false,
    "title" "text" NOT NULL,
    "description" "text",
    "venue_name" "text" NOT NULL,
    "venue_address" "text" NOT NULL,
    "date" "date" NOT NULL,
    "start_time" time without time zone NOT NULL,
    "end_time" time without time zone NOT NULL,
    "sections_config" "jsonb" DEFAULT '[{"label": "Open Mic", "slots": 10}]'::"jsonb" NOT NULL,
    "signup_opens_at" timestamp with time zone,
    "allow_multiple_slots" boolean DEFAULT false,
    "status" "text" DEFAULT 'draft'::"text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "publish_at" timestamp with time zone,
    "email_frequency" "text",
    "producer_message" "text",
    "city" "text",
    "latitude" double precision,
    "longitude" double precision,
    "instagram_url" "text",
    "source_link" "text",
    CONSTRAINT "events_email_frequency_check" CHECK (("email_frequency" = ANY (ARRAY['disabled'::"text", 'immediate'::"text", 'daily'::"text", 'weekly'::"text", 'monthly'::"text"])))
);


ALTER TABLE "public"."events" OWNER TO "postgres";


COMMENT ON COLUMN "public"."events"."producer_message" IS 'Message from Producer';



CREATE OR REPLACE VIEW "public"."event_availability" WITH ("security_invoker"='true') AS
 SELECT "id" AS "event_id",
    (COALESCE(( SELECT "sum"((("s"."value" ->> 'slots'::"text"))::integer) AS "sum"
           FROM "jsonb_array_elements"("e"."sections_config") "s"("value")), (0)::bigint))::integer AS "total_slots",
    (COALESCE(( SELECT "count"(*) AS "count"
           FROM "public"."bookings" "b"
          WHERE (("b"."event_id" = "e"."id") AND ("b"."cancelled_at" IS NULL))), (0)::bigint))::integer AS "booked_count"
   FROM "public"."events" "e"
  WHERE ("status" = 'published'::"text");


ALTER VIEW "public"."event_availability" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."event_templates" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "producer_id" "uuid",
    "series_id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "title" "text" NOT NULL,
    "description" "text",
    "venue_name" "text" NOT NULL,
    "venue_address" "text" NOT NULL,
    "start_time" time without time zone NOT NULL,
    "end_time" time without time zone NOT NULL,
    "sections_config" "jsonb" DEFAULT '[{"label": "Open Mic", "slots": 10}]'::"jsonb" NOT NULL,
    "signup_opens_hours_before" integer DEFAULT 48,
    "allow_multiple_slots" boolean DEFAULT false,
    "recurrence_end_date" "date",
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "publish_at" timestamp with time zone,
    "recurrence_rule" "jsonb",
    "signup_anchor_day" integer,
    "signup_anchor_time" time without time zone,
    "producer_message" "text"
);


ALTER TABLE "public"."event_templates" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."message_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "scheduled_message_id" "uuid",
    "booking_id" "uuid",
    "producer_id" "uuid",
    "email_address" "text" NOT NULL,
    "subject" "text" NOT NULL,
    "message_type" "text" NOT NULL,
    "sent_at" timestamp with time zone DEFAULT "now"(),
    "delivery_status" "text" DEFAULT 'sent'::"text",
    "error_message" "text"
);


ALTER TABLE "public"."message_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."message_templates" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "producer_id" "uuid",
    "name" "text" NOT NULL,
    "subject" "text" NOT NULL,
    "body_markdown" "text" NOT NULL,
    "is_system" boolean DEFAULT false,
    "trigger_type" "text",
    "trigger_hours" integer,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."message_templates" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."mic_submissions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "mic_name" "text" NOT NULL,
    "venue_name" "text",
    "city" "text",
    "next_occurrence" "date",
    "start_time" time without time zone,
    "end_time" time without time zone,
    "recurrence" "text",
    "details" "text",
    "submitter_name" "text" NOT NULL,
    "submitter_email" "text" NOT NULL,
    "external_link" "text",
    "instagram_url" "text",
    "status" "text" DEFAULT 'pending'::"text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."mic_submissions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."producer_features" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "producer_id" "uuid" NOT NULL,
    "feature" "text" NOT NULL,
    "granted_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."producer_features" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."producers" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "email" "text" NOT NULL,
    "name" "text",
    "venue_name" "text",
    "instagram" "text",
    "bio_markdown" "text",
    "profile_image_url" "text",
    "header_image_url" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "venue_address" "text",
    "timezone" "text" DEFAULT 'America/Los_Angeles'::"text",
    "slug" "text",
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "discoverable" boolean DEFAULT false NOT NULL,
    "website" "text",
    "event_window_days" integer DEFAULT 7 NOT NULL
);


ALTER TABLE "public"."producers" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."scheduled_messages" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "producer_id" "uuid",
    "event_id" "uuid",
    "template_id" "uuid",
    "subject" "text" NOT NULL,
    "body_markdown" "text" NOT NULL,
    "recipient_filter" "text" DEFAULT 'all_booked'::"text",
    "recipient_slots" integer[],
    "send_at" timestamp with time zone NOT NULL,
    "sent_at" timestamp with time zone,
    "status" "text" DEFAULT 'scheduled'::"text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."scheduled_messages" OWNER TO "postgres";


ALTER TABLE ONLY "public"."accounts"
    ADD CONSTRAINT "accounts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."accounts"
    ADD CONSTRAINT "accounts_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."accounts_users"
    ADD CONSTRAINT "accounts_users_pkey" PRIMARY KEY ("account_id", "user_id");



ALTER TABLE ONLY "public"."beta_access_codes"
    ADD CONSTRAINT "beta_access_codes_code_key" UNIQUE ("code");



ALTER TABLE ONLY "public"."beta_access_codes"
    ADD CONSTRAINT "beta_access_codes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."bookings"
    ADD CONSTRAINT "bookings_cancel_token_key" UNIQUE ("cancel_token");



ALTER TABLE ONLY "public"."bookings"
    ADD CONSTRAINT "bookings_event_id_slot_position_cancelled_at_key" UNIQUE ("event_id", "slot_position", "cancelled_at");



ALTER TABLE ONLY "public"."bookings"
    ADD CONSTRAINT "bookings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."comic_profiles"
    ADD CONSTRAINT "comic_profiles_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."comic_profiles"
    ADD CONSTRAINT "comic_profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."event_templates"
    ADD CONSTRAINT "event_templates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."events"
    ADD CONSTRAINT "events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."producers"
    ADD CONSTRAINT "hosts_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."producers"
    ADD CONSTRAINT "hosts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."message_logs"
    ADD CONSTRAINT "message_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."message_templates"
    ADD CONSTRAINT "message_templates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."mic_submissions"
    ADD CONSTRAINT "mic_submissions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."producer_features"
    ADD CONSTRAINT "producer_features_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."producer_features"
    ADD CONSTRAINT "producer_features_producer_id_feature_key" UNIQUE ("producer_id", "feature");



ALTER TABLE ONLY "public"."producers"
    ADD CONSTRAINT "producers_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."scheduled_messages"
    ADD CONSTRAINT "scheduled_messages_pkey" PRIMARY KEY ("id");



CREATE UNIQUE INDEX "bookings_unique_active_slot" ON "public"."bookings" USING "btree" ("event_id", "slot_position") WHERE ("cancelled_at" IS NULL);



CREATE INDEX "idx_bookings_cancel_token" ON "public"."bookings" USING "btree" ("cancel_token");



CREATE INDEX "idx_bookings_event_id" ON "public"."bookings" USING "btree" ("event_id");



CREATE INDEX "idx_bookings_guest_email" ON "public"."bookings" USING "btree" ("guest_email");



CREATE INDEX "idx_events_date" ON "public"."events" USING "btree" ("date");



CREATE INDEX "idx_events_email_frequency" ON "public"."events" USING "btree" ("email_frequency") WHERE ("email_frequency" IS NOT NULL);



CREATE INDEX "idx_events_host_id" ON "public"."events" USING "btree" ("producer_id");



CREATE INDEX "idx_events_series_id" ON "public"."events" USING "btree" ("series_id");



CREATE UNIQUE INDEX "idx_producers_slug" ON "public"."producers" USING "btree" ("slug");



CREATE OR REPLACE TRIGGER "update_producers_updated_at" BEFORE UPDATE ON "public"."producers" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



ALTER TABLE ONLY "public"."accounts_users"
    ADD CONSTRAINT "accounts_users_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id");



ALTER TABLE ONLY "public"."accounts_users"
    ADD CONSTRAINT "accounts_users_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."bookings"
    ADD CONSTRAINT "bookings_comic_profile_id_fkey" FOREIGN KEY ("comic_profile_id") REFERENCES "public"."comic_profiles"("id");



ALTER TABLE ONLY "public"."bookings"
    ADD CONSTRAINT "bookings_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."event_templates"
    ADD CONSTRAINT "event_templates_host_id_fkey" FOREIGN KEY ("producer_id") REFERENCES "public"."producers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."events"
    ADD CONSTRAINT "events_host_id_fkey" FOREIGN KEY ("producer_id") REFERENCES "public"."producers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."events"
    ADD CONSTRAINT "events_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "public"."event_templates"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."message_logs"
    ADD CONSTRAINT "message_logs_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."message_logs"
    ADD CONSTRAINT "message_logs_producer_id_fkey" FOREIGN KEY ("producer_id") REFERENCES "public"."producers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."message_logs"
    ADD CONSTRAINT "message_logs_scheduled_message_id_fkey" FOREIGN KEY ("scheduled_message_id") REFERENCES "public"."scheduled_messages"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."message_templates"
    ADD CONSTRAINT "message_templates_host_id_fkey" FOREIGN KEY ("producer_id") REFERENCES "public"."producers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."producer_features"
    ADD CONSTRAINT "producer_features_producer_id_fkey" FOREIGN KEY ("producer_id") REFERENCES "public"."producers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."scheduled_messages"
    ADD CONSTRAINT "scheduled_messages_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."scheduled_messages"
    ADD CONSTRAINT "scheduled_messages_host_id_fkey" FOREIGN KEY ("producer_id") REFERENCES "public"."producers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."scheduled_messages"
    ADD CONSTRAINT "scheduled_messages_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "public"."message_templates"("id") ON DELETE SET NULL;



CREATE POLICY "Anyone can create booking" ON "public"."bookings" FOR INSERT WITH CHECK (true);



CREATE POLICY "Anyone can submit mics" ON "public"."mic_submissions" FOR INSERT WITH CHECK (true);



CREATE POLICY "Anyone can validate codes" ON "public"."beta_access_codes" FOR SELECT USING (("is_active" = true));



CREATE POLICY "Anyone can view bookings for published events" ON "public"."bookings" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."events"
  WHERE (("events"."id" = "bookings"."event_id") AND ("events"."status" = 'published'::"text")))));



CREATE POLICY "Anyone can view producers" ON "public"."producers" FOR SELECT USING (true);



CREATE POLICY "Anyone can view published events" ON "public"."events" FOR SELECT USING (("status" = 'published'::"text"));



CREATE POLICY "Producers can delete bookings for own events" ON "public"."bookings" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."events"
  WHERE (("events"."id" = "bookings"."event_id") AND ("events"."producer_id" = "auth"."uid"())))));



CREATE POLICY "Producers can delete own events" ON "public"."events" FOR DELETE USING (("auth"."uid"() = "producer_id"));



CREATE POLICY "Producers can delete own message templates" ON "public"."message_templates" FOR DELETE USING (("auth"."uid"() = "producer_id"));



CREATE POLICY "Producers can delete own scheduled messages" ON "public"."scheduled_messages" FOR DELETE USING (("auth"."uid"() = "producer_id"));



CREATE POLICY "Producers can delete own templates" ON "public"."event_templates" FOR DELETE USING (("auth"."uid"() = "producer_id"));



CREATE POLICY "Producers can insert own events" ON "public"."events" FOR INSERT WITH CHECK (("auth"."uid"() = "producer_id"));



CREATE POLICY "Producers can insert own message logs" ON "public"."message_logs" FOR INSERT WITH CHECK (("auth"."uid"() = "producer_id"));



CREATE POLICY "Producers can insert own message templates" ON "public"."message_templates" FOR INSERT WITH CHECK (("auth"."uid"() = "producer_id"));



CREATE POLICY "Producers can insert own scheduled messages" ON "public"."scheduled_messages" FOR INSERT WITH CHECK (("auth"."uid"() = "producer_id"));



CREATE POLICY "Producers can insert own templates" ON "public"."event_templates" FOR INSERT WITH CHECK (("auth"."uid"() = "producer_id"));



CREATE POLICY "Producers can update bookings for own events" ON "public"."bookings" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."events"
  WHERE (("events"."id" = "bookings"."event_id") AND ("events"."producer_id" = "auth"."uid"())))));



CREATE POLICY "Producers can update own events" ON "public"."events" FOR UPDATE USING (("auth"."uid"() = "producer_id"));



CREATE POLICY "Producers can update own message templates" ON "public"."message_templates" FOR UPDATE USING (("auth"."uid"() = "producer_id"));



CREATE POLICY "Producers can update own profile" ON "public"."producers" FOR UPDATE USING (("auth"."uid"() = "id"));



CREATE POLICY "Producers can update own scheduled messages" ON "public"."scheduled_messages" FOR UPDATE USING (("auth"."uid"() = "producer_id"));



CREATE POLICY "Producers can update own templates" ON "public"."event_templates" FOR UPDATE USING (("auth"."uid"() = "producer_id"));



CREATE POLICY "Producers can view bookings for own events" ON "public"."bookings" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."events"
  WHERE (("events"."id" = "bookings"."event_id") AND ("events"."producer_id" = "auth"."uid"())))));



CREATE POLICY "Producers can view own events" ON "public"."events" FOR SELECT USING (("auth"."uid"() = "producer_id"));



CREATE POLICY "Producers can view own features" ON "public"."producer_features" FOR SELECT USING (("auth"."uid"() = "producer_id"));



CREATE POLICY "Producers can view own message logs" ON "public"."message_logs" FOR SELECT USING (("auth"."uid"() = "producer_id"));



CREATE POLICY "Producers can view own message templates" ON "public"."message_templates" FOR SELECT USING (("auth"."uid"() = "producer_id"));



CREATE POLICY "Producers can view own profile" ON "public"."producers" FOR SELECT USING (("auth"."uid"() = "id"));



CREATE POLICY "Producers can view own scheduled messages" ON "public"."scheduled_messages" FOR SELECT USING (("auth"."uid"() = "producer_id"));



CREATE POLICY "Producers can view own templates" ON "public"."event_templates" FOR SELECT USING (("auth"."uid"() = "producer_id"));



CREATE POLICY "Public accounts are viewable by anyone" ON "public"."accounts" FOR SELECT USING (("discoverable" = true));



CREATE POLICY "Users can insert their own account" ON "public"."accounts" FOR INSERT WITH CHECK (true);



CREATE POLICY "Users can update own comic profile" ON "public"."comic_profiles" FOR UPDATE USING (("auth"."uid"() = "id"));



CREATE POLICY "Users can update their own account" ON "public"."accounts" FOR UPDATE USING (("id" IN ( SELECT "accounts_users"."account_id"
   FROM "public"."accounts_users"
  WHERE ("accounts_users"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can view own comic profile" ON "public"."comic_profiles" FOR SELECT USING (("auth"."uid"() = "id"));



ALTER TABLE "public"."accounts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."accounts_users" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."beta_access_codes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."bookings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."comic_profiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."event_templates" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."events" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."message_logs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."message_templates" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."mic_submissions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."producer_features" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."producers" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."scheduled_messages" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";






ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."bookings";



GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";




























































































































































GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";



GRANT ALL ON FUNCTION "public"."validate_beta_code"("code_input" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."validate_beta_code"("code_input" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."validate_beta_code"("code_input" "text") TO "service_role";


















GRANT ALL ON TABLE "public"."accounts" TO "anon";
GRANT ALL ON TABLE "public"."accounts" TO "authenticated";
GRANT ALL ON TABLE "public"."accounts" TO "service_role";



GRANT ALL ON TABLE "public"."accounts_users" TO "anon";
GRANT ALL ON TABLE "public"."accounts_users" TO "authenticated";
GRANT ALL ON TABLE "public"."accounts_users" TO "service_role";



GRANT ALL ON TABLE "public"."beta_access_codes" TO "anon";
GRANT ALL ON TABLE "public"."beta_access_codes" TO "authenticated";
GRANT ALL ON TABLE "public"."beta_access_codes" TO "service_role";



GRANT ALL ON TABLE "public"."bookings" TO "anon";
GRANT ALL ON TABLE "public"."bookings" TO "authenticated";
GRANT ALL ON TABLE "public"."bookings" TO "service_role";



GRANT ALL ON TABLE "public"."comic_profiles" TO "anon";
GRANT ALL ON TABLE "public"."comic_profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."comic_profiles" TO "service_role";



GRANT ALL ON TABLE "public"."events" TO "anon";
GRANT ALL ON TABLE "public"."events" TO "authenticated";
GRANT ALL ON TABLE "public"."events" TO "service_role";



GRANT ALL ON TABLE "public"."event_availability" TO "anon";
GRANT ALL ON TABLE "public"."event_availability" TO "authenticated";
GRANT ALL ON TABLE "public"."event_availability" TO "service_role";



GRANT ALL ON TABLE "public"."event_templates" TO "anon";
GRANT ALL ON TABLE "public"."event_templates" TO "authenticated";
GRANT ALL ON TABLE "public"."event_templates" TO "service_role";



GRANT ALL ON TABLE "public"."message_logs" TO "anon";
GRANT ALL ON TABLE "public"."message_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."message_logs" TO "service_role";



GRANT ALL ON TABLE "public"."message_templates" TO "anon";
GRANT ALL ON TABLE "public"."message_templates" TO "authenticated";
GRANT ALL ON TABLE "public"."message_templates" TO "service_role";



GRANT ALL ON TABLE "public"."mic_submissions" TO "anon";
GRANT ALL ON TABLE "public"."mic_submissions" TO "authenticated";
GRANT ALL ON TABLE "public"."mic_submissions" TO "service_role";



GRANT ALL ON TABLE "public"."producer_features" TO "anon";
GRANT ALL ON TABLE "public"."producer_features" TO "authenticated";
GRANT ALL ON TABLE "public"."producer_features" TO "service_role";



GRANT ALL ON TABLE "public"."producers" TO "anon";
GRANT ALL ON TABLE "public"."producers" TO "authenticated";
GRANT ALL ON TABLE "public"."producers" TO "service_role";



GRANT ALL ON TABLE "public"."scheduled_messages" TO "anon";
GRANT ALL ON TABLE "public"."scheduled_messages" TO "authenticated";
GRANT ALL ON TABLE "public"."scheduled_messages" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";































