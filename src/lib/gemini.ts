import { GoogleGenerativeAI } from "@google/generative-ai";

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY as string;
const genAI = new GoogleGenerativeAI(API_KEY);

export async function generateNotes(topic: string, context?: string) {
  try {
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: 'object',
          properties: {
            title: { type: 'string' },
            sections: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  heading: { type: 'string' },
                  terms: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        word: { type: 'string' },
                        definition: { type: 'string' }
                      },
                      required: ['word', 'definition']
                    }
                  },
                  explanation: { type: 'string' }
                },
                required: ['heading', 'terms', 'explanation']
              }
            }
          },
          required: ['title', 'sections']
        }
      }
    });

    const prompt = `Create comprehensive study notes for: ${topic}${context ? '\n\nContext:\n' + context : ''}`;
    
    // Add timeout
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Request timeout after 60 seconds')), 60000)
    );
    
    const result = await Promise.race([
      model.generateContent(prompt),
      timeoutPromise
    ]) as any;
    
    return JSON.parse(result.response.text());
  } catch (error: any) {
    if (error?.message?.includes('timeout')) {
      throw new Error('Generation timed out. Please try again with a simpler topic.');
    }
    if (error?.status === 429 || error?.message?.includes('quota')) {
      throw new Error('Gemini API quota exceeded. Please upgrade your plan or try again tomorrow.');
    }
    if (error?.message?.includes('fetch') || error?.message?.includes('network')) {
      throw new Error('Network error. Please check your internet connection and try again.');
    }
    throw error;
  }
}

export async function generateQuiz(
  topic: string,
  config: { formats: Record<string, number> },
  context?: string
) {
  try {
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: 'object',
          properties: {
            flashcards: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  front: { type: 'string' },
                  back: { type: 'string' },
                  type: { type: 'string' }
                },
                required: ['front', 'back', 'type']
              }
            }
          },
          required: ['flashcards']
        }
      }
    });

    const formatsList = Object.entries(config.formats)
      .filter(([_, count]) => count > 0)
      .map(([format, count]) => `${count} ${format.replace('_', ' ')}`)
      .join(', ');

    const prompt = `Create flashcards for: ${topic}\nFormats to convert to flashcards: ${formatsList}\nMax 30 flashcards total.\n\nFor each format, create flashcards where:\n- Multiple choice: Front = question with options (labeled A, B, C, D but DO NOT highlight which is correct), Back = just the correct answer letter and correct answer text only\n- Identification: Front = question/hint, Back = answer\n- True/False: Front = statement, Back = True/False + explanation\n\nEach flashcard should have 'type' field indicating the original quiz format.${context ? '\n\nContext:\n' + context : ''}`;
    
    // Add timeout
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Request timeout after 60 seconds')), 60000)
    );
    
    const result = await Promise.race([
      model.generateContent(prompt),
      timeoutPromise
    ]) as any;
    
    return JSON.parse(result.response.text());
  } catch (error: any) {
    if (error?.message?.includes('timeout')) {
      throw new Error('Generation timed out. Please try again with a simpler topic or fewer flashcards.');
    }
    if (error?.status === 429 || error?.message?.includes('quota')) {
      throw new Error('Gemini API quota exceeded. Please upgrade your plan or try again tomorrow.');
    }
    if (error?.message?.includes('fetch') || error?.message?.includes('network')) {
      throw new Error('Network error. Please check your internet connection and try again.');
    }
    throw error;
  }
}

export async function generateFlashcards(topic: string, count: number = 10, context?: string) {
  try {
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: 'object',
          properties: {
            cards: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  front: { type: 'string' },
                  back: { type: 'string' }
                },
                required: ['front', 'back']
              }
            }
          },
          required: ['cards']
        }
      }
    });

    const prompt = `Create ${count} flashcards for: ${topic}. Front: word/term. Back: definition (the term must NOT appear in the back).${context ? '\n\nContext:\n' + context : ''}`;
    const result = await model.generateContent(prompt);
    return JSON.parse(result.response.text());
  } catch (error: any) {
    if (error?.status === 429 || error?.message?.includes('quota')) {
      throw new Error('Gemini API quota exceeded. Please upgrade your plan or try again tomorrow.');
    }
    throw error;
  }
}
