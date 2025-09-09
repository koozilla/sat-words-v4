import { ImageGenerator } from './image-generator';
import { DatabaseClient, DatabaseWordDetails } from './database-client';
import * as dotenv from 'dotenv';

dotenv.config();

async function generateWords26to50Images() {
  console.log('🎨 Starting image generation for words 26-50 (top_100 tier)...');
  
  try {
    // Initialize clients
    const imageGenerator = new ImageGenerator('./output');
    const dbClient = new DatabaseClient();
    
    // Get all words from top_100 tier (words 26-50)
    console.log('📚 Fetching words 26-50 from database...');
    const words = await dbClient.getAllWords();
    const words26to50 = words.filter(word => word.tier === 'top_100').slice(0, 25);
    
    console.log(`Found ${words26to50.length} words in top_100 tier (words 26-50)`);
    
    if (words26to50.length === 0) {
      console.log('❌ No words found in top_100 tier');
      return;
    }
    
    // Process each word
    for (let i = 0; i < words26to50.length; i++) {
      const word = words26to50[i];
      console.log(`\n🎨 Processing word ${i + 1}/${words26to50.length}: "${word.word}"`);
      
      try {
        // Generate new image
        console.log(`🎨 Generating new image for "${word.word}"`);
        const result = await imageGenerator.generateWordImage(word);
        
        console.log(`✅ Image generated successfully for "${word.word}"`);
        console.log(`📊 Image URL: ${result.imageUrl}`);
        console.log(`📝 Description: ${result.description}`);
        
        // Update database with new image
        console.log(`💾 Updating database for "${word.word}"`);
        await dbClient.updateWordImages(
          word.id,
          [result.imageUrl],
          [result.description]
        );
        
        console.log(`✅ Successfully updated "${word.word}" with new image`);
        
        // Add delay between requests to avoid rate limiting
        if (i < words26to50.length - 1) {
          console.log('⏳ Waiting 2 seconds before next word...');
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
        
      } catch (error) {
        console.error(`❌ Error processing "${word.word}":`, error);
        // Continue with next word
      }
    }
    
    console.log('\n🎉 Image generation complete for words 26-50!');
    console.log(`📊 Processed ${words26to50.length} words`);
    
  } catch (error) {
    console.error('❌ Error during image generation:', error);
  }
}

// Run the image generation
generateWords26to50Images().catch(console.error);