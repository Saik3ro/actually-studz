-- Create saved_quizzes table
CREATE TABLE IF NOT EXISTS saved_quizzes (
  id BIGSERIAL PRIMARY KEY,
  user_id uuid NOT NULL,
  session_id integer,
  title text NOT NULL,
  quiz_data jsonb NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  
  -- Foreign key constraints
  CONSTRAINT saved_quizzes_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT saved_quizzes_session_id_fkey FOREIGN KEY (session_id) REFERENCES study_sessions(id) ON DELETE CASCADE
);

-- Create index on user_id for faster queries
CREATE INDEX IF NOT EXISTS saved_quizzes_user_id_idx ON saved_quizzes(user_id);

-- Create index on created_at for ordering
CREATE INDEX IF NOT EXISTS saved_quizzes_created_at_idx ON saved_quizzes(created_at);

-- Enable RLS on saved_quizzes table
ALTER TABLE saved_quizzes ENABLE ROW LEVEL SECURITY;

-- Create policy for saved_quizzes table
CREATE POLICY "Users can only access their own saved quizzes" ON saved_quizzes
FOR ALL USING (user_id = auth.uid());
