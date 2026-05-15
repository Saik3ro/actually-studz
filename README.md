# Actually.Studz

Actually.Studz is a learning assistant web app for generating, reviewing, and saving study materials. It supports AI-generated study notes, quizzes, and flashcards, and stores user content with Supabase.

## Description

The app is built with:
- React + TypeScript
- Vite
- TanStack React Router
- Supabase for authentication and data storage
- Google-compatible generative AI via `groq-sdk` for quiz and note generation
- Tailwind CSS for styling

Key features:
- Generate study notes from topics or uploaded files
- Create and practice quizzes with multiple choice and true/false formats
- Save quizzes and review them later
- Copy blank quizzes and answer keys for offline study
- Save and delete generated study topics

## Setup

### Prerequisites

- Node.js 20+ installed
- A Supabase project with a public URL and anon key
- A Groq-compatible API key for generative AI

### Install dependencies

```bash
npm install
```

### Environment variables

Create a `.env` file in the project root with the following values:

```env
VITE_SUPABASE_URL=<your-supabase-url>
VITE_SUPABASE_ANON_KEY=<your-supabase-anon-key>
VITE_GROQ_API_KEY=<your-groq-api-key>
```

### Run locally

```bash
npm run dev
```

Open the local URL shown by Vite to use the app.

### Build for production

```bash
npm run build
```

### Preview production build

```bash
npm run preview
```

### Code quality

- Run ESLint:

```bash
npm run lint
```

- Format code with Prettier:

```bash
npm run format
```

## Project structure

- `src/` — application source files
- `src/routes/` — route-based pages
- `src/lib/` — shared utilities and Supabase client
- `src/components/` — UI components and reusable controls
- `supabase/migrations/` — database schema migrations

## Notes

- The application uses Supabase authentication and stores generated content in the Supabase database.
- The app expects the Supabase and Groq environment variables to be available at build/runtime.
