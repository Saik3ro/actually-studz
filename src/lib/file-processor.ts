import * as pdfjsLib from 'pdfjs-dist';
import PDFWorker from 'pdfjs-dist/build/pdf.worker?url';

// Set up PDF.js worker with proper URL handling
pdfjsLib.GlobalWorkerOptions.workerSrc = PDFWorker;

export async function extractTextFromFile(file: File): Promise<string> {
  const fileName = file.name.toLowerCase();
  
  if (fileName.endsWith('.pdf')) {
    return extractTextFromPDF(file);
  } else if (fileName.endsWith('.txt')) {
    return limitTextLength(await file.text());
  } else if (fileName.endsWith('.doc') || fileName.endsWith('.docx')) {
    return extractTextFromDocument(file);
  }
  
  throw new Error(`Unsupported file type: ${file.type}`);
}

function limitTextLength(text: string, maxLength: number = 8000): string {
  if (text.length <= maxLength) {
    return text;
  }
  
  // Try to cut at a sentence boundary
  const truncated = text.substring(0, maxLength);
  const lastPeriod = truncated.lastIndexOf('.');
  const lastNewline = truncated.lastIndexOf('\n');
  const cutPoint = Math.max(lastPeriod, lastNewline);
  
  if (cutPoint > maxLength * 0.8) {
    return truncated.substring(0, cutPoint + 1) + '\n\n[Content truncated...]';
  }
  
  return truncated + '\n\n[Content truncated...]';
}

async function extractTextFromPDF(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  
  // Configure PDF.js with options to handle problematic fonts
  const pdf = await pdfjsLib.getDocument({ 
    data: arrayBuffer,
    disableFontFace: false,
    cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/cmaps/'
  }).promise;
  
  let fullText = '';
  const maxChars = 8000; // Limit to ~8000 characters to avoid token limit
  
  try {
    for (let i = 1; i <= pdf.numPages; i++) {
      if (fullText.length >= maxChars) break;
      
      try {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items
          .map((item: any) => item.str || '')
          .join(' ')
          .trim();
        
        if (pageText) {
          fullText += pageText + '\n';
        }
      } catch (pageError) {
        // Continue with next page if one fails
        console.warn(`Warning extracting page ${i}:`, pageError);
        continue;
      }
    }
  } finally {
    pdf.destroy();
  }
  
  return limitTextLength(fullText, maxChars);
}

async function extractTextFromDocument(file: File): Promise<string> {
  // For DOCX files, we can use mammoth.js, but for now we'll return a message
  // Users can upload as PDF or TXT instead
  const arrayBuffer = await file.arrayBuffer();
  
  // Try to extract basic text from the file
  // This is a simplified approach - for better DOCX support, install mammoth
  try {
    const view = new Uint8Array(arrayBuffer);
    const str = String.fromCharCode.apply(null, Array.from(view));
    // Try to find text content
    const textMatches = str.match(/[a-zA-Z0-9\s\.\,\!\?]+/g) || [];
    return limitTextLength(textMatches.join(' '), 8000);
  } catch {
    throw new Error('Unable to extract text from document. Please convert to PDF or TXT.');
  }
}

export function generateTitleFromContent(content: string, fileName?: string): string {
  // First, clean the content by removing truncation markers
  const cleanContent = content.replace(/\[Content truncated\.\.\.\]/g, '').trim();
  
  // Extract first meaningful line or phrase as title
  const lines = cleanContent.split('\n').filter(line => line.trim().length > 0 && !line.includes('truncated'));
  
  for (const line of lines) {
    if (line.length > 5 && line.length < 150) {
      // Remove special characters and trim
      const cleanedLine = line
        .replace(/^[\s\-\*#]+/, '') // Remove leading special chars
        .replace(/[\n\r]+/g, ' ')
        .replace(/\s+/g, ' ') // Collapse multiple spaces
        .trim()
        .substring(0, 100);
      
      if (cleanedLine.length > 5 && !cleanedLine.includes('[')) {
        return cleanedLine;
      }
    }
  }
  
  // Fallback: use filename without extension
  if (fileName) {
    const title = fileName
      .replace(/\.[^.]+$/, '') // Remove file extension
      .replace(/[-_]/g, ' ')
      .trim();
    if (title.length > 0) {
      return title;
    }
  }
  
  // Last resort fallback
  return cleanContent
    .replace(/[\n\r]+/g, ' ')
    .replace(/\s+/g, ' ')
    .substring(0, 100)
    .trim();
}
