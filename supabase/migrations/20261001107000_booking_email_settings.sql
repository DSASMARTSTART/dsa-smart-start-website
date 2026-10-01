BEGIN;
CREATE TABLE live_email_settings(id text PRIMARY KEY DEFAULT 'booking' CHECK(id='booking'),config jsonb NOT NULL DEFAULT '{"locale":"en","templates":{}}');
INSERT INTO live_email_settings DEFAULT VALUES;
ALTER TABLE live_email_settings ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON live_email_settings FROM PUBLIC,anon,authenticated;
GRANT ALL ON live_email_settings TO service_role;
CREATE TRIGGER audit_email_settings AFTER UPDATE ON live_email_settings FOR EACH ROW EXECUTE FUNCTION admin_audit_change('settings');
CREATE FUNCTION live_email_configuration() RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
BEGIN
 IF NOT live_is_admin() THEN RAISE EXCEPTION 'Booking staff access required.'; END IF;
 RETURN (SELECT config FROM live_email_settings WHERE id='booking');
END $$;
CREATE FUNCTION save_live_email_configuration(p_config jsonb) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE entry record;
BEGIN
 IF NOT live_is_admin() THEN RAISE EXCEPTION 'Booking staff access required.'; END IF;
 IF jsonb_typeof(p_config) IS DISTINCT FROM 'object' OR coalesce(p_config->>'locale','') NOT IN ('en','it','sr','es') OR jsonb_typeof(p_config->'templates') IS DISTINCT FROM 'object' OR octet_length(p_config::text)>50000 THEN RAISE EXCEPTION 'Invalid email configuration.'; END IF;
 FOR entry IN SELECT * FROM jsonb_each(p_config->'templates') LOOP
 IF entry.key NOT IN ('reminder','expired','requested','confirmed','rejected','teacher','student_charged','student_refunded','rescheduled_charged','rescheduled_refunded','meeting_updated','cancelled') OR jsonb_typeof(entry.value) IS DISTINCT FROM 'object' OR jsonb_typeof(entry.value->'subject') IS DISTINCT FROM 'string' OR jsonb_typeof(entry.value->'body') IS DISTINCT FROM 'string' OR length(entry.value->>'subject')>150 OR length(entry.value->>'body')>2000 OR entry.value->>'subject' ~ E'[\r\n]' THEN RAISE EXCEPTION 'Use a subject up to 150 characters and plain message up to 2000 characters.'; END IF;
 END LOOP;
 UPDATE live_email_settings SET config=p_config WHERE id='booking';
END $$;
REVOKE ALL ON FUNCTION live_email_configuration(),save_live_email_configuration(jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION live_email_configuration(),save_live_email_configuration(jsonb) TO authenticated;
COMMIT;
