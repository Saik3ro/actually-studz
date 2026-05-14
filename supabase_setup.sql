-- Enable RLS on profiles table
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;

-- Allow users to view their own profile
CREATE POLICY "Users can view their own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

-- Allow users to insert their own profile
CREATE POLICY "Users can insert their own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Allow users to update their own profile
CREATE POLICY "Users can update their own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- Also create the study_sessions table if it doesn't exist
CREATE TABLE IF NOT EXISTS study_sessions (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  input_type TEXT NOT NULL CHECK (input_type IN ('topic', 'file')),
  topic TEXT,
  file_url TEXT,
  generated_types TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT user_topic_xor CHECK (
    (topic IS NOT NULL AND file_url IS NULL) OR
    (topic IS NULL AND file_url IS NOT NULL) OR
    (topic IS NOT NULL AND file_url IS NOT NULL)
  )
);

-- Enable RLS on study_sessions
ALTER TABLE study_sessions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own study_sessions" ON study_sessions;
DROP POLICY IF EXISTS "Users can insert their own study_sessions" ON study_sessions;
DROP POLICY IF EXISTS "Users can update their own study_sessions" ON study_sessions;

-- Users can only see their own study sessions
CREATE POLICY "Users can view their own study_sessions" ON study_sessions
  FOR SELECT USING (auth.uid() = user_id);

-- Users can only insert their own study sessions
CREATE POLICY "Users can insert their own study_sessions" ON study_sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own study sessions
CREATE POLICY "Users can update their own study_sessions" ON study_sessions
  FOR UPDATE USING (auth.uid() = user_id);

-- Create notes table
CREATE TABLE IF NOT EXISTS notes (
  id BIGSERIAL PRIMARY KEY,
  session_id BIGINT NOT NULL REFERENCES study_sessions(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content_json JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE notes ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view notes from their sessions" ON notes;
DROP POLICY IF EXISTS "Users can insert notes for their sessions" ON notes;

CREATE POLICY "Users can view notes from their sessions" ON notes
  FOR SELECT USING (
    session_id IN (SELECT id FROM study_sessions WHERE user_id = auth.uid())
  );
CREATE POLICY "Users can insert notes for their sessions" ON notes
  FOR INSERT WITH CHECK (
    session_id IN (SELECT id FROM study_sessions WHERE user_id = auth.uid())
  );

-- Create quizzes table
CREATE TABLE IF NOT EXISTS quizzes (
  id BIGSERIAL PRIMARY KEY,
  session_id BIGINT NOT NULL REFERENCES study_sessions(id) ON DELETE CASCADE,
  flashcards_json JSONB NOT NULL,
  config_json JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE quizzes ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view quizzes from their sessions" ON quizzes;
DROP POLICY IF EXISTS "Users can insert quizzes for their sessions" ON quizzes;
DROP POLICY IF EXISTS "Users can update quizzes for their sessions" ON quizzes;

CREATE POLICY "Users can view quizzes from their sessions" ON quizzes
  FOR SELECT USING (
    session_id IN (SELECT id FROM study_sessions WHERE user_id = auth.uid())
  );
CREATE POLICY "Users can insert quizzes for their sessions" ON quizzes
  FOR INSERT WITH CHECK (
    session_id IN (SELECT id FROM study_sessions WHERE user_id = auth.uid())
  );
CREATE POLICY "Users can update quizzes for their sessions" ON quizzes
  FOR UPDATE USING (
    session_id IN (SELECT id FROM study_sessions WHERE user_id = auth.uid())
  );