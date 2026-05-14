-- Run this in the Supabase SQL editor
-- Adds server-side rate limiting and validation via database triggers

-- 1. Max 3 question submissions per user per hour (enforced in DB)
CREATE OR REPLACE FUNCTION check_question_submission_rate()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF (
    SELECT COUNT(*) FROM submitted_questions
    WHERE submitted_by = NEW.submitted_by
      AND created_at > NOW() - INTERVAL '1 hour'
  ) >= 3 THEN
    RAISE EXCEPTION 'Too many question submissions. Try again later.';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_question_submission_rate ON submitted_questions;
CREATE TRIGGER trg_question_submission_rate
  BEFORE INSERT ON submitted_questions
  FOR EACH ROW EXECUTE FUNCTION check_question_submission_rate();

-- 2. No duplicate complaints on the same question from the same user
CREATE OR REPLACE FUNCTION check_complaint_duplicate()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM question_complaints
    WHERE complained_by = NEW.complained_by
      AND question_id = NEW.question_id
  ) THEN
    RAISE EXCEPTION 'You have already reported this question.';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_complaint_duplicate ON question_complaints;
CREATE TRIGGER trg_complaint_duplicate
  BEFORE INSERT ON question_complaints
  FOR EACH ROW EXECUTE FUNCTION check_complaint_duplicate();

-- 3. Max 5 complaints per user per hour
CREATE OR REPLACE FUNCTION check_complaint_rate()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF (
    SELECT COUNT(*) FROM question_complaints
    WHERE complained_by = NEW.complained_by
      AND created_at > NOW() - INTERVAL '1 hour'
  ) >= 5 THEN
    RAISE EXCEPTION 'Too many complaints. Try again later.';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_complaint_rate ON question_complaints;
CREATE TRIGGER trg_complaint_rate
  BEFORE INSERT ON question_complaints
  FOR EACH ROW EXECUTE FUNCTION check_complaint_rate();

-- 4. Username length limit on profiles
ALTER TABLE profiles
  ADD CONSTRAINT valid_username_length
  CHECK (username IS NULL OR char_length(username) BETWEEN 1 AND 30);
