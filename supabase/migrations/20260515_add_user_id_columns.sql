-- Add user_id column to notes table
ALTER TABLE notes
ADD COLUMN user_id uuid NOT NULL DEFAULT auth.uid();

-- Add foreign key constraint for notes
ALTER TABLE notes
ADD CONSTRAINT notes_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Add user_id column to quizzes table
ALTER TABLE quizzes
ADD COLUMN user_id uuid NOT NULL DEFAULT auth.uid();

-- Add foreign key constraint for quizzes
ALTER TABLE quizzes
ADD CONSTRAINT quizzes_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Add user_id column to flashcards table
ALTER TABLE flashcards
ADD COLUMN user_id uuid NOT NULL DEFAULT auth.uid();

-- Add foreign key constraint for flashcards
ALTER TABLE flashcards
ADD CONSTRAINT flashcards_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Optional: Add RLS policies if they don't exist
-- Enable RLS on notes table
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;

-- Create policy for notes table
CREATE POLICY "Users can only access their own notes" ON notes
FOR ALL USING (user_id = auth.uid());

-- Enable RLS on quizzes table
ALTER TABLE quizzes ENABLE ROW LEVEL SECURITY;

-- Create policy for quizzes table
CREATE POLICY "Users can only access their own quizzes" ON quizzes
FOR ALL USING (user_id = auth.uid());

-- Enable RLS on flashcards table
ALTER TABLE flashcards ENABLE ROW LEVEL SECURITY;

-- Create policy for flashcards table
CREATE POLICY "Users can only access their own flashcards" ON flashcards
FOR ALL USING (user_id = auth.uid());
