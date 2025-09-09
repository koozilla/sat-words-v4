import { ImageClient } from './image-client';
import * as fs from 'fs';
import * as path from 'path';

async function testImageGeneration() {
  console.log('🧪 Testing image generation only...');
  
  try {
    // Initialize the image client
    const imageClient = new ImageClient();
    
    // Simple test prompt
    const prompt = `
Create a memorable, educational cartoon-style image for the SAT vocabulary word "Benevolent".

Word Definition: "Well meaning and kindly; characterized by doing good for others."
Part of Speech: adjective
Synonyms: kind, generous, compassionate, caring, good-hearted

Image Requirements:
- Cartoon/animated style (not photorealistic)
- Clear visual connection to the word's meaning
- Memorable and distinctive
- Appropriate for high school students
- Educational value for vocabulary learning
- High contrast and clear details

Generate an image that will help students remember "Benevolent" means "Well meaning and kindly; characterized by doing good for others.".
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
