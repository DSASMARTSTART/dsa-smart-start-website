BEGIN;
CREATE TABLE student_invitation_attempts(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),actor_id uuid NOT NULL REFERENCES users(id),email text NOT NULL,created_at timestamptz NOT NULL DEFAULT now());
CREATE INDEX student_invitation_email ON student_invitation_attempts(email,created_at DESC);
CREATE INDEX student_invitation_actor ON student_invitation_attempts(actor_id,created_at DESC);
ALTER TABLE student_invitation_attempts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON student_invitation_attempts FROM PUBLIC,anon,authenticated;
GRANT ALL ON student_invitation_attempts TO service_role;
CREATE FUNCTION claim_student_invitation(p_actor uuid,p_email text) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE result uuid;
BEGIN
 IF NOT EXISTS(SELECT 1 FROM users WHERE id=p_actor AND role='admin' AND status='active') THEN RAISE EXCEPTION 'Administrator access required.'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(p_actor::text,12));
 PERFORM pg_advisory_xact_lock(hashtextextended(lower(p_email),13));
 IF (SELECT count(*) FROM student_invitation_attempts WHERE actor_id=p_actor AND created_at>now()-interval '1 hour')>=20 OR EXISTS(SELECT 1 FROM student_invitation_attempts WHERE email=lower(p_email) AND created_at>now()-interval '5 minutes') THEN RETURN NULL; END IF;
 INSERT INTO student_invitation_attempts(actor_id,email) VALUES(p_actor,lower(p_email)) RETURNING id INTO result;
 DELETE FROM student_invitation_attempts WHERE created_at<now()-interval '7 days';
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION claim_student_invitation(uuid,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION claim_student_invitation(uuid,text) TO service_role;
COMMIT;
