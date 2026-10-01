BEGIN;
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check CHECK(role IN ('student','admin','editor','secretary'));
-- Booking operations staff do not gain access to finance, roles or catalog writes.
CREATE OR REPLACE FUNCTION live_is_admin() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
 SELECT EXISTS(SELECT 1 FROM users WHERE id=auth.uid() AND status='active' AND role IN ('admin','secretary'));
$$;
ALTER TABLE audit_logs DROP CONSTRAINT IF EXISTS audit_logs_entity_type_check;
ALTER TABLE audit_logs ADD CONSTRAINT audit_logs_entity_type_check CHECK(entity_type IN ('user','course','module','lesson','homework','enrollment','purchase','teacher','booking','settings','discount','asset','credit'));
CREATE FUNCTION admin_audit_change() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE actor users; before_doc jsonb; after_doc jsonb; entity text;
BEGIN
 SELECT * INTO actor FROM users WHERE id=auth.uid();
 IF actor.id IS NULL THEN RETURN coalesce(NEW,OLD); END IF;
 before_doc:=CASE WHEN TG_OP<>'INSERT' THEN to_jsonb(OLD) END;
 after_doc:=CASE WHEN TG_OP<>'DELETE' THEN to_jsonb(NEW) END;
 IF before_doc IS NOT DISTINCT FROM after_doc THEN RETURN coalesce(NEW,OLD); END IF;
 entity:=TG_ARGV[0];
 IF entity='asset' THEN before_doc:=before_doc-'video_uri'-'embed_url'; after_doc:=after_doc-'video_uri'-'embed_url'; END IF;
 INSERT INTO audit_logs(action,entity_type,entity_id,admin_id,admin_name,before_data,after_data,description)
 VALUES(entity||'_'||CASE TG_OP WHEN 'INSERT' THEN 'created' WHEN 'UPDATE' THEN 'updated' ELSE 'deleted' END,entity,coalesce(after_doc->>'id',before_doc->>'id',after_doc->>'enrollment_id',before_doc->>'enrollment_id',after_doc->>'program','singleton'),actor.id,coalesce(actor.name,'Staff'),before_doc,after_doc,entity||' '||lower(TG_OP));
 RETURN coalesce(NEW,OLD);
END $$;
REVOKE ALL ON FUNCTION admin_audit_change() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER audit_teacher AFTER INSERT OR UPDATE OR DELETE ON live_teachers FOR EACH ROW EXECUTE FUNCTION admin_audit_change('teacher');
CREATE TRIGGER audit_booking AFTER INSERT OR UPDATE OR DELETE ON live_bookings FOR EACH ROW EXECUTE FUNCTION admin_audit_change('booking');
CREATE TRIGGER audit_rules AFTER UPDATE ON live_program_settings FOR EACH ROW EXECUTE FUNCTION admin_audit_change('settings');
CREATE TRIGGER audit_terms AFTER INSERT OR UPDATE ON live_course_terms FOR EACH ROW EXECUTE FUNCTION admin_audit_change('enrollment');
CREATE TRIGGER audit_discount AFTER INSERT OR UPDATE OR DELETE ON discount_codes FOR EACH ROW EXECUTE FUNCTION admin_audit_change('discount');
CREATE TRIGGER audit_settings AFTER UPDATE ON app_settings FOR EACH ROW EXECUTE FUNCTION admin_audit_change('settings');
CREATE FUNCTION admin_grant_course(p_user uuid,p_course uuid,p_reason text DEFAULT '') RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE result uuid; actor users;
BEGIN
 IF NOT is_active_administrator() THEN RAISE EXCEPTION 'Active administrator access required.'; END IF;
 SELECT * INTO actor FROM users WHERE id=auth.uid();
 IF NOT EXISTS(SELECT 1 FROM users WHERE id=p_user AND status='active') OR NOT EXISTS(SELECT 1 FROM courses WHERE id=p_course) THEN RAISE EXCEPTION 'Choose an active student and an existing course.'; END IF;
 INSERT INTO enrollments(user_id,course_id,status) VALUES(p_user,p_course,'active')
 ON CONFLICT(user_id,course_id) DO UPDATE SET status='active',completed_at=NULL RETURNING id INTO result;
 INSERT INTO audit_logs(action,entity_type,entity_id,admin_id,admin_name,description)
 VALUES('enrollment_granted','enrollment',result::text,actor.id,actor.name,'Access granted/restored: '||left(coalesce(p_reason,''),500));
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION admin_grant_course(uuid,uuid,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION admin_grant_course(uuid,uuid,text) TO authenticated;
CREATE FUNCTION admin_transactions(p_filters jsonb DEFAULT '{}',p_page int DEFAULT 1,p_limit int DEFAULT 15) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public,pg_temp SET statement_timeout='10s' AS $$
DECLARE result jsonb;
BEGIN
 IF NOT is_active_administrator() THEN RAISE EXCEPTION 'Active administrator access required.'; END IF;
 IF p_page IS NULL OR p_limit IS NULL OR p_page<1 OR p_limit NOT BETWEEN 1 AND 500 THEN RAISE EXCEPTION 'Invalid page.'; END IF;
 WITH filtered AS MATERIALIZED (
 SELECT p.*,jsonb_build_object('id',u.id,'name',u.name,'email',u.email) AS users,
 jsonb_build_object('id',c.id,'title',c.title,'product_type',c.product_type) AS courses,
 jsonb_build_object('code',d.code) AS discount_codes
 FROM purchases p JOIN users u ON u.id=p.user_id JOIN courses c ON c.id=p.course_id LEFT JOIN discount_codes d ON d.id=p.discount_code_id
 WHERE (coalesce(p_filters->>'search','')='' OR position(lower(p_filters->>'search') in lower(coalesce(p.transaction_id,'')||' '||u.name||' '||u.email))>0)
 AND (nullif(p_filters->>'dateFrom','') IS NULL OR p.purchased_at>=(p_filters->>'dateFrom')::date::timestamp AT TIME ZONE 'Europe/Belgrade')
 AND (nullif(p_filters->>'dateTo','') IS NULL OR p.purchased_at<((p_filters->>'dateTo')::date+1)::timestamp AT TIME ZONE 'Europe/Belgrade')
 AND (coalesce(p_filters->>'paymentMethod','all')='all' OR p.payment_method=p_filters->>'paymentMethod')
 AND (coalesce(p_filters->>'productType','all')='all' OR c.product_type=p_filters->>'productType')
 AND p.currency=coalesce(nullif(p_filters->>'currency',''),'EUR')
 ), page AS (SELECT * FROM filtered ORDER BY purchased_at DESC,id LIMIT p_limit OFFSET (p_page-1)*p_limit), paid AS (SELECT * FROM filtered WHERE status IN ('completed','refunded'))
 SELECT jsonb_build_object('data',coalesce((SELECT jsonb_agg(to_jsonb(x) ORDER BY purchased_at DESC,id) FROM page x),'[]'), 'count',(SELECT count(*) FROM filtered),
 'stats',jsonb_build_object('totalRevenue',(SELECT coalesce(sum(amount-coalesce(refunded_amount,0)),0) FROM paid),'totalTransactions',(SELECT count(*) FROM paid),'averageOrderValue',(SELECT coalesce(avg(amount-coalesce(refunded_amount,0)),0) FROM paid),'discountedOrders',(SELECT count(*) FROM paid WHERE discount_code_id IS NOT NULL)),
 'currencies',(SELECT coalesce(jsonb_agg(currency ORDER BY currency),'[]') FROM (SELECT DISTINCT currency FROM purchases) x)) INTO result;
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION admin_transactions(jsonb,int,int) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION admin_transactions(jsonb,int,int) TO authenticated;
COMMIT;
