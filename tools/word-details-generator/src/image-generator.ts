import { GeminiClient } from './gemini-client';
import { ImageClient } from './image-client';
import { ImageStorage } from './image-storage';
import { DatabaseWordDetails } from './database-client';

export interface ImageGenerationResult {
  imageUrl: string;
  description: string;
  fileName: string;
}

export class ImageGenerator {
  private geminiClient: GeminiClient;
  private imageClient: ImageClient;
  private storageClient: ImageStorage;

  constructor(outputDir: string) {
    this.geminiClient = new GeminiClient();
    this.imageClient = new ImageClient();
    this.storageClient = new ImageStorage(outputDir);
  }

  async generateWordImage(wordData: DatabaseWordDetails): Promise<ImageGenerationResult> {
    try {
      console.log(`🎨 Generating image for word: ${wordData.word}`);
      
      // 1. Create image prompt using database word details
      const prompt = this.createImagePrompt(wordData);
      
      // 2. Generate image with ImageClient (using @google/genai)
      const imageBuffer = await this.imageClient.generateImage(prompt);
      
      // 3. Upload to storage (local file for now)
      const imageUrl = await this.storageClient.uploadImage(imageBuffer, wordData.word);
      
      // 4. Generate description
      const description = await this.geminiClient.generateImageDescription(
        wordData.word, 
        wordData.definition, 
        imageUrl
      );
      
      // 5. Extract filename from URL
      const fileName = this.extractFileNameFromUrl(imageUrl);
      
      console.log(`✅ Image generated successfully for: ${wordData.word}`);
      
      return {
        imageUrl,
        description,
        fileName
      };
    } catch (error) {
      console.error(`❌ Error generating image for ${wordData.word}:`, error);
      throw error;
    }
  }

  private createImagePrompt(wordData: DatabaseWordDetails): string {
    return `
Create a memorable, educational cartoon-style image for the SAT vocabulary word "${wordData.word}".

Word Definition: "${wordData.definition}"
Part of Speech: ${wordData.part_of_speech}
Example Sentence: "${wordData.example_sentence}"
Synonyms: ${wordData.synonyms.join(', ')}
Difficulty: ${wordData.difficulty} | Tier: ${wordData.tier}

Image Requirements:
- Cartoon/animated style (k-pop style animation - vibrant, energetic, colorful)
- Create a scene that illustrates the EXAMPLE SENTENCE
- Show the word in action through the example context
- Clear visual connection to the word's meaning
- Memorable and distinctive characters/setting
- Appropriate for high school students
- Educational value for vocabulary learning
- High contrast and clear details
- 16:9 aspect ratio, high resolution
- DO NOT include the actual word "${wordData.word}" anywhere in the image

Visual Style Guidelines:
- Use bright, vibrant colors with strong contrast
- Create engaging characters that students can relate to
- Include symbolic elements that reinforce meaning
- Avoid text in the image (especially the word itself)
- Make it instantly recognizable and memorable
- Use visual storytelling through the example sentence
- Focus on the ACTION or SITUATION described in the example
- K-pop style animation: vibrant, energetic, colorful, dynamic

Scene Creation Instructions:
1. Read the example sentence carefully
2. Create a cartoon scene that shows the example situation
3. Make the characters expressive and relatable
4. Use visual metaphors that help remember the word
5. Ensure the scene clearly demonstrates the word's meaning
6. IMPORTANT: Do not include the word "${wordData.word}" in the image

Generate an image that tells the story of the example sentence: "${wordData.example_sentence}"
This will help students remember "${wordData.word}" means "${wordData.definition}".
`;
  }

  private extractFileNameFromUrl(url: string): string {
    // Extract filename from URL for database reference
    const urlParts = url.split('/');
    return urlParts[urlParts.length - 1];
  }
}
