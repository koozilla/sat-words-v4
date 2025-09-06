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
    this.model = this.genAI.getGenerativeModel({ model: 'gemini-pro' });
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
}
