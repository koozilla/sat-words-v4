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
Synonyms: ${wordData.synonyms.join(', ')}
Example: "${wordData.example_sentence}"
Difficulty: ${wordData.difficulty} | Tier: ${wordData.tier}

Image Requirements:
- Cartoon/animated style (not photorealistic)
- Clear visual connection to the word's meaning
- Memorable and distinctive
- Appropriate for high school students
- Educational value for vocabulary learning
- High contrast and clear details
- 16:9 aspect ratio, high resolution

Visual Style Guidelines:
- Use bright, contrasting colors
- Include symbolic elements that reinforce meaning
- Avoid text in the image
- Make it instantly recognizable and memorable
- Use visual metaphors that help remember the word

Generate an image that will help students remember "${wordData.word}" means "${wordData.definition}".
`;
  }

  private extractFileNameFromUrl(url: string): string {
    // Extract filename from URL for database reference
    const urlParts = url.split('/');
    return urlParts[urlParts.length - 1];
  }
}
