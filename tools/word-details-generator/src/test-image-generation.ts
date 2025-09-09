import { ImageClient } from './image-client';
import * as fs from 'fs';
import * as path from 'path';

async function testImageGeneration() {
  console.log('🧪 Testing image generation only...');
  
  try {
    // Initialize the image client
    const imageClient = new ImageClient();
    
    // Enhanced test prompt focusing on example sentence with k-top style
    const prompt = `
Create a memorable, educational cartoon-style image for the SAT vocabulary word "Benevolent".

Word Definition: "Well meaning and kindly; characterized by doing good for others."
Part of Speech: adjective
Example Sentence: "The benevolent teacher stayed after school to help struggling students."
Synonyms: kind, generous, compassionate, caring, good-hearted

Image Requirements:
- Cartoon/animated style (k-pop style animation - vibrant, energetic, colorful)
- Create a scene that illustrates the EXAMPLE SENTENCE
- Show the word in action through the example context
- Clear visual connection to the word's meaning
- Memorable and distinctive characters/setting
- Appropriate for high school students
- Educational value for vocabulary learning
- High contrast and clear details
- DO NOT include the actual word "Benevolent" anywhere in the image

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
6. IMPORTANT: Do not include the word "Benevolent" in the image

Generate an image that tells the story of the example sentence: "The benevolent teacher stayed after school to help struggling students."
This will help students remember "Benevolent" means "Well meaning and kindly; characterized by doing good for others.".
    `;
    
    console.log('🎨 Generating image...');
    const imageBuffer = await imageClient.generateImage(prompt);
    
    // Save the image to a file for inspection
    const outputPath = path.join(__dirname, '..', 'output', 'test-image.png');
    fs.writeFileSync(outputPath, imageBuffer);
    
    console.log(`✅ Image saved to: ${outputPath}`);
    console.log(`📊 Image size: ${imageBuffer.length} bytes`);
    
  } catch (error) {
    console.error('❌ Error testing image generation:', error);
  }
}

testImageGeneration().catch(console.error);
