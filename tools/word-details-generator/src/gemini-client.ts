import { GoogleGenerativeAI } from '@google/generative-ai';
import * as dotenv from 'dotenv';

dotenv.config();

export interface WordDetails {
  word: string;
  definition: string;
  partOfSpeech: string;
  synonyms: string[];
  antonyms: string[];
  examples: string[];
  difficulty: 'Easy' | 'Medium' | 'Hard';
  tier: string;
}

export class GeminiClient {
  private genAI: GoogleGenerativeAI;
  private model: any;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is required');
    }
    
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = this.genAI.getGenerativeModel({ 
      model: 'gemini-2.5-flash'
    });
    
    console.log('✅ Gemini 2.5 Flash for text generation');
  }

  async generateWordDetails(word: string, difficulty: string, tier: string): Promise<WordDetails> {
    const prompt = this.createPrompt(word, difficulty, tier);
    
    try {
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      return this.parseResponse(text, word, difficulty, tier);
    } catch (error) {
      console.error(`Error generating details for word "${word}":`, error);
      throw error;
    }
  }

  private createPrompt(word: string, difficulty: string, tier: string): string {
    return `
Generate comprehensive details for the SAT vocabulary word "${word}" with difficulty level "${difficulty}" from tier "${tier}".

Please provide the following information in JSON format:

{
  "definition": "Clear, concise definition appropriate for SAT level",
  "partOfSpeech": "Part of speech (noun, verb, adjective, adverb, etc.)",
  "synonyms": ["synonym1", "synonym2", "synonym3", "synonym4", "synonym5"],
  "antonyms": ["antonym1", "antonym2", "antonym3"],
  "examples": [
    "Example sentence 1 showing the word in context",
    "Example sentence 2 showing the word in context"
  ]
}

Guidelines:
- Definition should be clear and appropriate for high school students
- Part of speech should be accurate
- Synonyms should be relevant and commonly used
- Antonyms should be direct opposites
- Examples should be clear, educational, and show the word in proper context
- Difficulty level "${difficulty}" should be reflected in the complexity of the definition and examples
- All content should be appropriate for SAT vocabulary learning

Return only the JSON object, no additional text.
`;
  }

  private parseResponse(response: string, word: string, difficulty: string, tier: string): WordDetails {
    try {
      // Clean the response text
      const cleanedResponse = response.trim().replace(/```json\n?/g, '').replace(/```\n?/g, '');
      
      const parsed = JSON.parse(cleanedResponse);
      
      return {
        word,
        definition: parsed.definition || '',
        partOfSpeech: parsed.partOfSpeech || '',
        synonyms: Array.isArray(parsed.synonyms) ? parsed.synonyms : [],
        antonyms: Array.isArray(parsed.antonyms) ? parsed.antonyms : [],
        examples: Array.isArray(parsed.examples) ? parsed.examples : [],
        difficulty: difficulty as 'Easy' | 'Medium' | 'Hard',
        tier
      };
    } catch (error) {
      console.error(`Error parsing response for word "${word}":`, error);
      console.error('Response:', response);
      
      // Return fallback data
      return {
        word,
        definition: `Definition for ${word}`,
        partOfSpeech: 'unknown',
        synonyms: [],
        antonyms: [],
        examples: [],
        difficulty: difficulty as 'Easy' | 'Medium' | 'Hard',
        tier
      };
    }
  }

  async generateImage(prompt: string): Promise<Buffer> {
    console.log('🎨 Generating image with Gemini 2.5 Flash Preview...');
    console.log('Prompt:', prompt);
    
    try {
      // Use Gemini 2.5 Flash Preview with image generation capabilities
      const result = await this.model.generateContent({
        contents: [{ 
          parts: [{ 
            text: `Generate a memorable, educational cartoon-style image for SAT vocabulary learning. ${prompt}` 
          }] 
        }],
        generationConfig: {
          responseModalities: ['TEXT', 'IMAGE']
        }
      });
      
      const response = await result.response;
      
      // Check if the response contains image data
      if (response.parts && response.parts.length > 0) {
        for (const part of response.parts) {
          if (part.image && part.image.data) {
            // Convert base64 data to Buffer
            const imageData = part.image.data;
            const mimeType = part.image.mimeType || 'image/png';
            
            console.log(`✅ Generated image (${mimeType})`);
            return Buffer.from(imageData, 'base64');
          }
        }
      }
      
      // Fallback: If no image data found, create a placeholder
      console.log('⚠️ No image data found in response, creating placeholder');
      return this.createPlaceholderImage(prompt);
      
    } catch (error) {
      console.error('❌ Error generating image with Gemini:', error);
      console.log('🔄 Creating placeholder image...');
      return this.createPlaceholderImage(prompt);
    }
  }

  private createPlaceholderImage(prompt: string): Buffer {
    const svgContent = `
      <svg width="800" height="600" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:#4F46E5;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#7C3AED;stop-opacity:1" />
          </linearGradient>
        </defs>
        <rect width="800" height="600" fill="url(#grad1)"/>
        <text x="400" y="280" font-family="Arial, sans-serif" font-size="48" font-weight="bold" text-anchor="middle" fill="white">Gemini Image</text>
        <text x="400" y="330" font-family="Arial, sans-serif" font-size="24" text-anchor="middle" fill="white">Generated with Gemini 2.0 Flash</text>
        <text x="400" y="380" font-family="Arial, sans-serif" font-size="18" text-anchor="middle" fill="white">Vocabulary Learning Image</text>
      </svg>
    `;
    
    return Buffer.from(svgContent, 'utf-8');
  }

  async generateImageDescription(word: string, definition: string, imageUrl: string): Promise<string> {
    const prompt = `
Analyze this image created for the SAT vocabulary word "${word}" and explain WHY this image helps students remember the word's meaning.

Word: "${word}"
Definition: "${definition}"
Image URL: ${imageUrl}

Your task is to write a description that explains the CONNECTION between the image and the word's meaning, focusing on:

1. **Visual Memory Aid**: How does the image create a memorable visual association?
2. **Meaning Reinforcement**: What visual elements directly represent the word's definition?
3. **Learning Strategy**: Why would this image help a student remember "${word}" means "${definition}"?

Guidelines:
- Focus on the LEARNING VALUE, not just image description
- Explain the visual metaphor or symbolism used
- Highlight memorable elements that reinforce the meaning
- Keep it concise but educational (2-3 sentences)
- Write for high school students learning SAT vocabulary

Example format:
"This image helps remember [word] because [visual element] represents [meaning aspect]. The [specific detail] creates a strong visual association with [definition concept], making it easier to recall that [word] means [definition]."

Return only the explanation, no additional text.
`;

    try {
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      return response.text().trim();
    } catch (error) {
      console.error(`Error generating image description for word "${word}":`, error);
      return `This image helps remember "${word}" by creating a visual association with its meaning "${definition}".`;
    }
  }
}
