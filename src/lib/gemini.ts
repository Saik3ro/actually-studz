import Groq from "groq-sdk";

const API_KEY = import.meta.env.VITE_GROQ_API_KEY as string;
const groq = new Groq({ apiKey: API_KEY, dangerouslyAllowBrowser: true });
const MODEL_NAME = "llama-3.1-8b-instant";

function safeParseJSON(text: string): any {
  let cleaned = text.trim();
  
  // Remove markdown code blocks
  cleaned = cleaned.replace(/^```(?:json)?\s*\n?/i, '');
  cleaned = cleaned.replace(/\n?```\s*$/i, '');
  
  // Extract JSON object
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}') + 1;
  if (start >= 0 && end > start) {
    cleaned = cleaned.substring(start, end);
  }
  
  // Fix common JSON errors aggressively
  cleaned = cleaned
    .replace(/,\s*}/g, '}')
    .replace(/,\s*]/g, ']')
    .replace(/}\s*{/g, '},{')
    .replace(/]\s*\[/g, '],[')
    .replace(/]\s*{/g, '],{')
    .replace(/}\s*\[/g, '},[')
    .replace(/\n/g, ' ')
    .replace(/\r/g, '')
    .replace(/\t/g, ' ');
  
  // Try native parse first
  try { return JSON.parse(cleaned); } catch (e1: any) {}
  
  // Try removing all whitespace and reparsing
  try {
    const noSpace = cleaned.replace(/\s+/g, ' ');
    return JSON.parse(noSpace);
  } catch (e2: any) {}
  
  // Last resort: use a simple regex to extract the structure
  try {
    const simpleObj: any = {};
    const titleMatch = cleaned.match(/"title"\s*:\s*"([^"]*)"/);
    if (titleMatch) simpleObj.title = titleMatch[1];
    
    const sectionsMatch = cleaned.match(/"sections"\s*:\s*(\[[\s\S]*\])/);
    if (sectionsMatch) {
      try { simpleObj.sections = JSON.parse(sectionsMatch[1]); } 
      catch (e3: any) { simpleObj.sections = []; }
    }
    
    if (simpleObj.title || simpleObj.sections) return simpleObj;
  } catch (e4: any) {}
  
  throw new Error(`Failed to parse JSON. Preview: ${cleaned.substring(0, 200)}...`);
}

async function createCompletion(prompt: string) {
  const completion = await groq.chat.completions.create({
    model: MODEL_NAME,
    messages: [
      { role: "system", content: "You are an assistant that returns ONLY valid JSON. No markdown, no code blocks, no additional text. Start with { and end with }." },
      { role: "user", content: prompt }
    ],
    max_completion_tokens: 4096,
    temperature: 0.3,
  });

  const rawText = completion.choices?.[0]?.message?.content;
  console.log("Raw response:", rawText?.substring(0, 200));

  if (!rawText) {
    throw new Error("Empty response from Groq");
  }

  return safeParseJSON(rawText);
}

export async function generateNotes(topic: string, context?: string) {
  if (!topic || !topic.trim()) throw new Error("Topic is required");

  if (context && context.length > 1500) {
    context = context.substring(0, 1500) + '... (content truncated)';
  }

  const prompt = `You are an expert educator creating detailed study notes.

TOPIC: ${topic}
${context ? 'CONTEXT: ' + context : ''}

REQUIREMENTS:
- Generate COMPREHENSIVE notes with at least 5-8 detailed sections
- Each section must have:
  * A clear heading
  * 3-5 key terms with full definitions (at least 1-2 sentences each)
  * A thorough explanation paragraph (at least 4-6 sentences)
- Total output should be at least 800 words
- Use proper academic language
- Be specific and factual, not vague
- Cover the topic in depth from fundamentals to advanced concepts

FORMAT: Return ONLY valid JSON with this structure:
{
  "title": "Topic Title",
  "sections": [
    {
      "heading": "Section Heading",
      "terms": [
        {"word": "Term", "definition": "Full definition with detail"}
      ],
      "explanation": "Thorough explanation paragraph covering this section's concepts in depth."
    }
  ]
}

IMPORTANT: Every field must be filled with substantial content. No empty arrays or short placeholder text.`;

  console.log("Generating notes for:", topic);
  const result = await createCompletion(prompt);
  console.log("Received notes response");
  return result;
}

export async function generateQuiz(
  topic: string,
  config: { formats: Record<string, number> },
  context?: string
) {
  if (!topic || !topic.trim()) throw new Error("Topic is required");

  if (context && context.length > 1500) {
    context = context.substring(0, 1500) + '... (content truncated)';
  }

  const formatsList = Object.entries(config.formats)
    .filter(([, count]) => count > 0)
    .map(([format, count]) => `${count} ${format.replace(/_/g, " ")}`)
    .join(", ");

  const prompt = `You are an expert exam creator. Generate a quiz with these exact formats and counts: ${formatsList}

CRITICAL JSON FORMAT RULES:
1. Every question MUST have an "answer" field with the correct answer as a string
2. Multiple choice questions MUST have an "options" array with exactly 4 strings in BOTH answered_version AND blank_version
3. True/False questions MUST have "options": ["True", "False"] in BOTH versions
4. Identification questions MUST have an "answer" string
5. Essay questions MUST have an "answer" field with a model answer
6. NEVER use null, undefined, or empty strings for answers

TOPIC: ${topic}
MAX ITEMS: 30 total across all formats
${context ? 'CONTEXT: ' + context.substring(0, 1500) : ''}

Return ONLY valid JSON matching this structure:
{
  "answered_version": {
    "sections": [
      {
        "format": "multiple_choice",
        "items": [
          {
            "question": "What is X?",
            "answer": "Correct answer here",
            "options": ["Option A", "Option B", "Correct answer here", "Option D"]
          }
        ]
      },
      {
        "format": "true_false",
        "items": [
          {
            "question": "Statement here",
            "answer": "True",
            "options": ["True", "False"]
          }
        ]
      }
    ]
  },
  "blank_version": {
    "sections": [
      {
        "format": "multiple_choice",
        "items": [
          {
            "question": "What is X?",
            "options": ["Option A", "Option B", "Correct answer here", "Option D"]
          }
        ]
      }
    ]
  }
}`;

  console.log("Generating quiz for:", topic);
  const result = await createCompletion(prompt);
  console.log("Received quiz response");
  return result;
}

export async function generateFlashcards(topic: string, count: number = 10, context?: string) {
  if (!topic || !topic.trim()) throw new Error("Topic is required");
  if (count > 30) count = 30;

  const prompt = `Create ${count} flashcards for: ${topic}${context ? "\n\nContext:\n" + context : ""}. Front: word/term. Back: definition (the term must NOT appear in the back). You must respond with ONLY valid JSON. No markdown, no code blocks, no additional text. Start with { and end with }. Return a JSON object with a cards array of {front, back} objects.`;

  console.log("Generating flashcards for:", topic);
  const result = await createCompletion(prompt);
  console.log("Received flashcards response");
  return result;
}
