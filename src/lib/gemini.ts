import { GoogleGenerativeAI } from "@google/generative-ai";

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY as string;
const genAI = new GoogleGenerativeAI(API_KEY);

export async function generateNotes(topic: string, context?: string) {
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
  const result = await model.generateContent(prompt);
  return JSON.parse(result.response.text());
}

export async function generateQuiz(
  topic: string,
  config: { formats: Record<string, number> },
  context?: string
) {
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: 'object',
        properties: {
          answered_version: {
            type: 'object',
            properties: {
              sections: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    format: { type: 'string' },
                    items: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          question: { type: 'string' },
                          answer: { type: 'string' },
                          options: { type: 'array', items: { type: 'string' } },
                          explanation: { type: 'string' }
                        },
                        required: ['question', 'answer']
                      }
                    }
                  },
                  required: ['format', 'items']
                }
              }
            },
            required: ['sections']
          },
          blank_version: {
            type: 'object',
            properties: {
              sections: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    format: { type: 'string' },
                    items: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          question: { type: 'string' },
                          options: { type: 'array', items: { type: 'string' } }
                        },
                        required: ['question']
                      }
                    }
                  },
                  required: ['format', 'items']
                }
              }
            },
            required: ['sections']
          }
        },
        required: ['answered_version', 'blank_version']
      }
    }
  });

  const formatsList = Object.entries(config.formats)
    .filter(([_, count]) => count > 0)
    .map(([format, count]) => `${count} ${format.replace('_', ' ')}`)
    .join(', ');

  const prompt = `Create a quiz for: ${topic}\nFormats: ${formatsList}\nMax 30 items total.${context ? '\n\nContext:\n' + context : ''}`;
  const result = await model.generateContent(prompt);
  return JSON.parse(result.response.text());
}

export async function generateFlashcards(topic: string, count: number = 10, context?: string) {
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
}
