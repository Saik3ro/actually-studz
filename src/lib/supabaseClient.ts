import { createClient } from "@supabase/supabase-js";

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string | null;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        };
      };
      study_sessions: {
        Row: {
          id: number;
          user_id: string;
          input_type: "topic" | "file";
          topic: string | null;
          file_url: string | null;
          generated_types: string[];
          created_at: string;
        };
      };
      notes: {
        Row: {
          id: number;
          session_id: number;
          title: string;
          content_json: any;
          created_at: string;
        };
      };
      quizzes: {
        Row: {
          id: number;
          session_id: number;
          answered_version_json: any;
          blank_version_json: any;
          config_json: any;
          created_at: string;
        };
      };
      flashcard_decks: {
        Row: {
          id: number;
          user_id: string;
          title: string;
          input_type: "topic" | "file";
          topic: string | null;
          file_url: string | null;
          created_at: string;
        };
      };
      flashcards: {
        Row: {
          id: number;
          deck_id: number;
          front: string;
          back: string;
          difficulty: "easy" | "medium" | "hard";
          created_at: string;
        };
      };
    };
  };
}

export const supabase = createClient<Database>(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
);

export default supabase;
