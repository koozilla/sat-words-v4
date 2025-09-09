import { ImageGenerator } from './image-generator';
import { DatabaseClient, DatabaseWordDetails } from './database-client';
import * as dotenv from 'dotenv';

dotenv.config();

async function generateAndUploadBenevolent() {
  console.log('🎨 Generating image for "benevolent" and uploading to Vercel...');
  
  try {
    // Initialize the image generator
    const imageGenerator = new ImageGenerator('./output');
    
    // Create word data for "benevolent" matching DatabaseWordDetails interface
    const wordData: DatabaseWordDetails = {
      id: '', // Will be set by database
      word: 'benevolent',
      definition: 'Well meaning and kindly; characterized by doing good for others.',
      part_of_speech: 'adjective',
      synonyms: ['kind', 'generous', 'compassionate', 'caring', 'good-hearted'],
      antonyms: ['malevolent', 'cruel', 'unkind', 'harsh'],
      example_sentence: 'The benevolent teacher stayed after school to help struggling students.',
      difficulty: 'Medium',
      tier: '2',
      image_urls: [],
      image_descriptions: []
    };
    
    console.log('📝 Word data prepared for:', wordData.word);
    
    // Generate the image
    console.log('🎨 Generating image...');
    const result = await imageGenerator.generateWordImage(wordData);
    
    console.log('✅ Image generated successfully!');
    console.log('📊 Image URL:', result.imageUrl);
    console.log('📝 Description:', result.description);
    console.log('📁 File name:', result.fileName);
    
    // Update database with image information
    console.log('💾 Updating database...');
    const dbClient = new DatabaseClient();
    
    // Check if word exists in database
    const existingWord = await dbClient.getWordDetails(wordData.word);
    
    if (existingWord) {
      // Update existing word with image data
      const updatedImageUrls = [...existingWord.image_urls, result.imageUrl];
      const updatedImageDescriptions = [...existingWord.image_descriptions, result.description];
      
      const success = await dbClient.updateWordImages(existingWord.id, updatedImageUrls, updatedImageDescriptions);
      
      if (success) {
        console.log('✅ Updated existing word in database');
      } else {
        console.log('❌ Failed to update existing word in database');
      }
    } else {
      console.log('⚠️ Word "benevolent" not found in database');
      console.log('💡 You may need to add the word to the database first using the main word generation process');
    }
    
    console.log('🎉 Successfully generated and uploaded "benevolent" image!');
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

if (require.main === module) {
  generateAndUploadBenevolent();
}
