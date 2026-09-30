BEGIN;
-- Durable event outbox: sending email is never part of the booking transaction.
CREATE TABLE live_booking_notifications (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 booking_id uuid NOT NULL REFERENCES live_bookings(id),
 event text NOT NULL,
 audience text NOT NULL CHECK(audience IN ('student','teacher','admin')),
 payload jsonb NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 delivered_at timestamptz,
 attempts integer NOT NULL DEFAULT 0,
 available_at timestamptz NOT NULL DEFAULT now(),
 locked_until timestamptz,
 last_error text
);
ALTER TABLE live_booking_notifications ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON live_booking_notifications FROM PUBLIC,anon,authenticated;
GRANT ALL ON live_booking_notifications TO service_role;
CREATE INDEX live_notifications_due ON live_booking_notifications(available_at) WHERE delivered_at IS NULL;
CREATE FUNCTION public.queue_live_booking_notification() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE event_name text; recipient text; snapshot jsonb;
BEGIN
 IF TG_OP='INSERT' THEN event_name:='requested';
 ELSIF NEW.status IS DISTINCT FROM OLD.status THEN event_name:=CASE NEW.status WHEN 'booked' THEN 'confirmed' WHEN 'cancelled' THEN coalesce(NEW.cancellation_reason,'cancelled') ELSE NULL END;
 ELSIF NEW.zoom IS DISTINCT FROM OLD.zoom AND NEW.status='booked' AND NEW.starts_at>now() THEN event_name:='meeting_updated';
 END IF;
 IF event_name IS NULL THEN RETURN NEW; END IF;
 snapshot:=jsonb_build_object('title',NEW.title,'startsAt',NEW.starts_at,'timezone',NEW.timezone,'status',NEW.status,'creditUsed',NEW.credit_used,'teacher',(SELECT profile->>'name' FROM live_teachers WHERE id=NEW.teacher_id),'student',(SELECT name FROM users WHERE id=NEW.user_id));
 FOREACH recipient IN ARRAY CASE WHEN event_name='requested' THEN ARRAY['student','teacher','admin'] ELSE ARRAY['student','teacher'] END LOOP
  INSERT INTO live_booking_notifications(booking_id,event,audience,payload) VALUES(NEW.id,event_name,recipient,snapshot);
 END LOOP;
 RETURN NEW;
END $$;
CREATE TRIGGER queue_live_booking_notification AFTER INSERT OR UPDATE ON live_bookings FOR EACH ROW EXECUTE FUNCTION queue_live_booking_notification();
CREATE UNIQUE INDEX live_notification_reminder_once ON live_booking_notifications(booking_id,audience) WHERE event='reminder';
CREATE FUNCTION public.prepare_live_booking_notifications() RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
BEGIN
 -- Unapproved requests never become no-shows and must not hold credits forever.
 UPDATE live_bookings SET status='cancelled',credit_used=false,cancellation_reason='expired',updated_at=now() WHERE status='pending' AND starts_at<=now();
 INSERT INTO live_booking_notifications(booking_id,event,audience,payload)
 SELECT b.id,'reminder',recipient,jsonb_build_object('title',b.title,'startsAt',b.starts_at,'timezone',b.timezone,'status',b.status,'creditUsed',b.credit_used,'teacher',t.profile->>'name','student',u.name)
 FROM live_bookings b JOIN live_teachers t ON t.id=b.teacher_id JOIN users u ON u.id=b.user_id
 CROSS JOIN unnest(ARRAY['student','teacher']) recipient
 WHERE b.status='booked' AND b.starts_at>now() AND b.starts_at<=now()+interval '24 hours'
 ON CONFLICT(booking_id,audience) WHERE event='reminder' DO NOTHING;
END $$;
CREATE FUNCTION public.claim_live_booking_notifications() RETURNS SETOF live_booking_notifications LANGUAGE sql SECURITY DEFINER SET search_path=public,pg_temp AS $$
 UPDATE live_booking_notifications SET locked_until=now()+interval '5 minutes',attempts=attempts+1
 WHERE id IN (SELECT id FROM live_booking_notifications WHERE delivered_at IS NULL AND attempts<12 AND available_at<=now() AND (locked_until IS NULL OR locked_until<now()) ORDER BY created_at LIMIT 5 FOR UPDATE SKIP LOCKED) RETURNING *;
$$;
CREATE FUNCTION public.live_notification_health() RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
BEGIN
 PERFORM live_require_user();
 IF NOT live_is_admin() THEN RAISE EXCEPTION 'Administrator access required.'; END IF;
 RETURN (SELECT jsonb_build_object('queued',count(*) FILTER(WHERE delivered_at IS NULL),'failed',count(*) FILTER(WHERE delivered_at IS NULL AND attempts>=12),'oldestQueued',min(created_at) FILTER(WHERE delivered_at IS NULL)) FROM live_booking_notifications);
END $$;
REVOKE ALL ON FUNCTION public.queue_live_booking_notification(),public.prepare_live_booking_notifications(),public.claim_live_booking_notifications() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.prepare_live_booking_notifications(),public.claim_live_booking_notifications() TO service_role;
REVOKE ALL ON FUNCTION public.live_notification_health() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.live_notification_health() TO authenticated;
COMMIT;
