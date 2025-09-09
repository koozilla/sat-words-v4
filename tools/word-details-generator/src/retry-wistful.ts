import { ImageGenerator } from './image-generator';
import { DatabaseClient, DatabaseWordDetails } from './database-client';
import * as dotenv from 'dotenv';

dotenv.config();

async function retryWistful() {
  console.log('🎨 Retrying image generation for "Wistful"...');
  
  try {
    // Initialize clients
    const imageGenerator = new ImageGenerator('./output');
    const dbClient = new DatabaseClient();
    
    // Get the Wistful word from database
    console.log('📚 Fetching "Wistful" from database...');
    const allWords = await dbClient.getAllWords();
    const wistfulWord = allWords.find(word => word.word === 'Wistful');
    
    if (!wistfulWord) {
      console.log('❌ "Wistful" not found in database');
      return;
    }
    
    console.log(`Found "Wistful" in ${wistfulWord.tier} tier`);
    
    try {
      // Generate new image
      console.log(`🎨 Generating new image for "Wistful"`);
      const result = await imageGenerator.generateWordImage(wistfulWord);
      
      console.log(`✅ Image generated successfully for "Wistful"`);
      console.log(`📊 Image URL: ${result.imageUrl}`);
      console.log(`📝 Description: ${result.description}`);
      
      // Update database with new image
      console.log(`💾 Updating database for "Wistful"`);
      await dbClient.updateWordImages(
        wistfulWord.id,
        [result.imageUrl],
        [result.description]
      );
      
      console.log(`✅ Successfully updated "Wistful" with new image`);
      
    } catch (error) {
      console.error(`❌ Error processing "Wistful":`, error);
    }
    
  } catch (error) {
    console.error('❌ Error during retry:', error);
  }
}

// Run the retry
retryWistful().catch(console.error);
