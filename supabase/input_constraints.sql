-- Run this in the Supabase SQL editor
-- Adds column-level length constraints to prevent oversized inputs

-- Questions
ALTER TABLE remote_questions
  ADD CONSTRAINT question_length     CHECK (char_length(question) BETWEEN 5 AND 500),
  ADD CONSTRAINT answer_count        CHECK (array_length(answers, 1) = 4);

-- Submitted questions
ALTER TABLE submitted_questions
  ADD CONSTRAINT sub_question_length CHECK (char_length(question) BETWEEN 5 AND 500);

-- Complaint messages
ALTER TABLE question_complaints
  ADD CONSTRAINT complaint_msg_length CHECK (char_length(message) BETWEEN 1 AND 1000);
