import { ImageGenerator } from './image-generator';
import { DatabaseClient, DatabaseWordDetails } from './database-client';
import * as dotenv from 'dotenv';

dotenv.config();

async function generateProvocativeImage() {
  console.log('🎨 Generating image for "Provocative"...');
  
  try {
    // Initialize clients
    const imageGenerator = new ImageGenerator('./output');
    const dbClient = new DatabaseClient();
    
    // Get the Provocative word from database
    console.log('📚 Fetching "Provocative" from database...');
    const allWords = await dbClient.getAllWords();
    const provocativeWord = allWords.find(word => word.word === 'Provocative');
    
    if (!provocativeWord) {
      console.log('❌ "Provocative" not found in database');
      return;
    }
    
    console.log(`Found "Provocative" in ${provocativeWord.tier} tier`);
    
    try {
      // Generate new image
      console.log(`🎨 Generating new image for "Provocative"`);
      const result = await imageGenerator.generateWordImage(provocativeWord);
      
      console.log(`✅ Image generated successfully for "Provocative"`);
      console.log(`📊 Image URL: ${result.imageUrl}`);
      console.log(`📝 Description: ${result.description}`);
      
      // Update database with new image
      console.log(`💾 Updating database for "Provocative"`);
      await dbClient.updateWordImages(
        provocativeWord.id,
        [result.imageUrl],
        [result.description]
      );
      
      console.log(`✅ Successfully updated "Provocative" with new image`);
      
    } catch (error) {
      console.error(`❌ Error processing "Provocative":`, error);
    }
    
  } catch (error) {
    console.error('❌ Error during generation:', error);
  }
}

// Run the generation
generateProvocativeImage().catch(console.error);
