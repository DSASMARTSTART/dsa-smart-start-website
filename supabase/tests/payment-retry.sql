-- Load payment-retry-bootstrap.sql and the retry migration into a disposable
-- database first. All assertions exercise the real PL/pgSQL implementations.
DO $$
DECLARE
  buyer UUID := gen_random_uuid();
  course UUID := gen_random_uuid();
  second_course UUID := gen_random_uuid();
  discount UUID := gen_random_uuid();
  purchase UUID;
  result JSONB;
  did_raise BOOLEAN := false;
  original_enrolled_at TIMESTAMPTZ;
BEGIN
  INSERT INTO purchases (user_id, course_id, transaction_id, discount_code_id)
  VALUES (buyer, course, 'failed-then-paid', discount) RETURNING id INTO purchase;

  result := fail_purchase_webhook('failed-then-paid', '{"transaction":{"status":"FAILED"}}');
  ASSERT (result->>'success')::boolean, 'initial failure must be recorded';
  ASSERT (SELECT status = 'failed' AND webhook_verified FROM purchases WHERE id = purchase);
  ASSERT NOT EXISTS (SELECT 1 FROM enrollments), 'failure must not grant access';

  result := confirm_purchase_webhook('failed-then-paid', '{"transaction":{"status":"SUCCESS"}}');
  ASSERT (result->>'success')::boolean, 'verified retry must recover a failed purchase';
  ASSERT (result->>'purchases_confirmed')::int = 1;
  ASSERT (result->>'enrollments_created')::int = 1;
  ASSERT (SELECT status = 'completed' AND payment_provider_response #>> '{transaction,status}' = 'SUCCESS'
    FROM purchases WHERE id = purchase), 'success must replace the stale failure evidence';
  ASSERT (SELECT count(*) = 1 FROM enrollments WHERE user_id = buyer AND course_id = course AND status = 'active');
  ASSERT (SELECT count(*) = 1 FROM discount_code_uses WHERE purchase_id = purchase),
    'verified failure flag must not suppress discount recording';

  UPDATE enrollments SET enrolled_at = NOW() - INTERVAL '3 days' WHERE user_id = buyer AND course_id = course
    RETURNING enrolled_at INTO original_enrolled_at;
  result := confirm_purchase_webhook('failed-then-paid', '{"transaction":{"status":"SUCCESS"}}');
  ASSERT (result->>'success')::boolean;
  ASSERT (result->>'enrollments_created')::int = 0;
  ASSERT (SELECT count(*) = 1 FROM discount_code_uses WHERE purchase_id = purchase), 'replay must not count twice';
  ASSERT (SELECT count(*) = 1 FROM enrollments WHERE user_id = buyer AND course_id = course);
  ASSERT (SELECT enrolled_at = original_enrolled_at FROM enrollments WHERE user_id = buyer AND course_id = course),
    'duplicate success must not reset the course access start date';
  PERFORM fail_purchase_webhook('failed-then-paid', '{"transaction":{"status":"FAILED"}}');
  ASSERT (SELECT status = 'completed' FROM purchases WHERE id = purchase), 'late failure must not undo success';

  UPDATE enrollments SET status = 'revoked' WHERE user_id = buyer AND course_id = course;
  PERFORM confirm_purchase_webhook('failed-then-paid', '{}');
  ASSERT (SELECT status = 'revoked' FROM enrollments WHERE user_id = buyer AND course_id = course),
    'duplicate success must not undo a subsequent admin revocation';

  UPDATE purchases SET status = 'refunded' WHERE id = purchase;
  UPDATE enrollments SET status = 'revoked' WHERE user_id = buyer AND course_id = course;
  result := confirm_purchase_webhook('failed-then-paid', '{"transaction":{"status":"SUCCESS"}}');
  ASSERT NOT (result->>'success')::boolean, 'a refunded purchase is not eligible';
  ASSERT (SELECT status = 'refunded' FROM purchases WHERE id = purchase);
  ASSERT (SELECT status = 'revoked' FROM enrollments WHERE user_id = buyer AND course_id = course);

  INSERT INTO purchases (user_id, course_id, transaction_id, discount_code_id)
  VALUES (buyer, course, 'multi-item', discount), (buyer, second_course, 'multi-item', discount);
  result := fail_purchase_webhook('multi-item', '{}');
  ASSERT (result->>'purchases_failed')::int = 2, 'failure must cover the whole cart';
  result := confirm_purchase_webhook('multi-item', '{}');
  ASSERT (result->>'purchases_confirmed')::int = 2, 'success must recover the whole cart';
  ASSERT (SELECT count(*) = 2 FROM enrollments WHERE user_id = buyer AND status = 'active');

  -- Legacy checkout code may have already recorded the discount while pending.
  INSERT INTO purchases (user_id, course_id, transaction_id, discount_code_id, status, webhook_verified)
  VALUES (buyer, gen_random_uuid(), 'legacy-discount', discount, 'failed', true) RETURNING id INTO purchase;
  INSERT INTO discount_code_uses (discount_code_id, user_id, purchase_id) VALUES (discount, buyer, purchase);
  PERFORM confirm_purchase_webhook('legacy-discount', '{}');
  ASSERT (SELECT count(*) = 1 FROM discount_code_uses WHERE purchase_id = purchase);

  INSERT INTO purchases (user_id, course_id, transaction_id) VALUES (buyer, gen_random_uuid(), 'first-success');
  result := confirm_purchase_webhook('first-success', '{}');
  ASSERT (result->>'success')::boolean, 'ordinary first-attempt success must still work';
  result := confirm_purchase_webhook('missing-order', '{}');
  ASSERT NOT (result->>'success')::boolean;
  result := confirm_purchase_webhook(' ', '{}');
  ASSERT NOT (result->>'success')::boolean;

  ASSERT NOT has_function_privilege('anon', 'public.confirm_purchase_webhook(text,jsonb)', 'EXECUTE');
  ASSERT NOT has_function_privilege('authenticated', 'public.confirm_purchase_webhook(text,jsonb)', 'EXECUTE');
  ASSERT NOT has_function_privilege('anon', 'public.fail_purchase_webhook(text,jsonb)', 'EXECUTE');
  ASSERT NOT has_function_privilege('authenticated', 'public.fail_purchase_webhook(text,jsonb)', 'EXECUTE');
  ASSERT has_function_privilege('service_role', 'public.confirm_purchase_webhook(text,jsonb)', 'EXECUTE');
  ASSERT has_function_privilege('service_role', 'public.fail_purchase_webhook(text,jsonb)', 'EXECUTE');

  -- Force the second enrollment in a cart to fail: the first must roll back too.
  ALTER TABLE enrollments ADD CONSTRAINT reject_test_course
    CHECK (course_id <> 'ffffffff-ffff-4fff-8fff-ffffffffffff'::uuid);
  INSERT INTO purchases (id, user_id, course_id, transaction_id, discount_code_id)
  VALUES ('10000000-0000-4000-8000-000000000001', buyer, gen_random_uuid(), 'rollback', discount),
         ('10000000-0000-4000-8000-000000000002', buyer, 'ffffffff-ffff-4fff-8fff-ffffffffffff', 'rollback', discount);
  BEGIN
    PERFORM confirm_purchase_webhook('rollback', '{}');
  EXCEPTION WHEN SQLSTATE 'P0001' THEN
    did_raise := true;
  END;
  ASSERT did_raise, 'partial confirmation must raise';
  ASSERT (SELECT count(*) = 2 FROM purchases WHERE transaction_id = 'rollback' AND status = 'pending');
  ASSERT NOT EXISTS (SELECT 1 FROM enrollments e JOIN purchases p USING (user_id, course_id)
    WHERE p.transaction_id = 'rollback'), 'partial enrollment must roll back';
  ASSERT NOT EXISTS (SELECT 1 FROM discount_code_uses d JOIN purchases p ON p.id = d.purchase_id
    WHERE p.transaction_id = 'rollback'), 'partial discount use must roll back';
END $$;
