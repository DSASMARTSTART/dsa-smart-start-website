ALTER TABLE enrollments ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE enrollments ADD UNIQUE(user_id,course_id);
ALTER TABLE courses ADD COLUMN pricing jsonb DEFAULT '{"price":200,"currency":"EUR"}',ADD COLUMN instructor jsonb;
CREATE TABLE discount_codes(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),code text);
CREATE TABLE app_settings(id text PRIMARY KEY);
ALTER TABLE purchases ADD COLUMN transaction_id text, ADD COLUMN discount_code_id uuid REFERENCES discount_codes(id);
CREATE TABLE audit_logs(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),action text NOT NULL,entity_type text NOT NULL,entity_id text NOT NULL,admin_id uuid NOT NULL REFERENCES users(id),admin_name text NOT NULL,before_data jsonb,after_data jsonb,description text,timestamp timestamptz DEFAULT now());
