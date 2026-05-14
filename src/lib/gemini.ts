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
    max_tokens: 1200,
    temperature: 0.2,
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

  const prompt = `Create comprehensive, detailed study notes for: ${topic}${context ? "\n\nContext:\n" + context : ""}.

REQUIREMENTS:
- Generate LONG, comprehensive notes (minimum 1000 words)
- Structure with numbered sections (1., 2., 3., etc.)
- Each section should have lettered subsections (a., b., c., etc.)
- Each term/concept should be: **bold term**: definition
- Include detailed explanations as full paragraphs
- Use proper indentation for subsections (2rem margin)
- NO em dashes anywhere — replace with commas or periods
- Title should be bold and larger at the top

FORMAT:
Title: [Topic Name]

1. [Main Section Heading]
   a. **Term**: Definition of the term with detailed explanation.
      Full paragraph explaining the concept in depth, covering all important aspects, examples, and applications.
   b. **Another Term**: Another detailed definition.
      Comprehensive explanation paragraph covering multiple aspects of this concept.

2. [Next Main Section]
   a. **Term**: Definition...
      Detailed explanation...

You must respond with ONLY valid JSON. No markdown, no code blocks, no additional text. Start with { and end with }. Return a JSON object with title (string) and sections (array of {heading, terms: [{word, definition}], explanation}).`;

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

  const formatsList = Object.entries(config.formats)
    .filter(([, count]) => count > 0)
    .map(([format, count]) => `${count} ${format.replace(/_/g, " ")}`)
    .join(", ");

  const prompt = `Create a quiz for: ${topic}${context ? "\n\nContext:\n" + context : ""}. Include formats: ${formatsList}. You must respond with ONLY valid JSON. No markdown, no code blocks, no additional text. Start with { and end with }. Return a JSON object with answered_version and blank_version, each containing sections arrays of {format, items: [{question, answer?, options?}]}.`;

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
