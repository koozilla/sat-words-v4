import { ImageGenerator } from './image-generator';
import { DatabaseClient, DatabaseWordDetails } from './database-client';
import * as dotenv from 'dotenv';

dotenv.config();

async function regenerateTop25Images() {
  console.log('🔄 Starting regeneration of top 25 word images...');
  
  try {
    // Initialize clients
    const imageGenerator = new ImageGenerator('./output');
    const dbClient = new DatabaseClient();
    
    // Get all words from top_25 tier
    console.log('📚 Fetching top 25 words from database...');
    const words = await dbClient.getAllWords();
    const top25Words = words.filter(word => word.tier === 'top_25');
    
    console.log(`Found ${top25Words.length} words in top_25 tier`);
    
    if (top25Words.length === 0) {
      console.log('❌ No words found in top_25 tier');
      return;
    }
    
    // Process each word
    for (let i = 0; i < top25Words.length; i++) {
      const word = top25Words[i];
      console.log(`\n🎨 Processing word ${i + 1}/${top25Words.length}: "${word.word}"`);
      
      try {
        // Clear existing images first
        console.log(`🗑️  Clearing existing images for "${word.word}"`);
        await dbClient.updateWordImages(word.id, [], []);
        
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
        if (i < top25Words.length - 1) {
          console.log('⏳ Waiting 2 seconds before next word...');
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
        
      } catch (error) {
        console.error(`❌ Error processing "${word.word}":`, error);
        // Continue with next word
      }
    }
    
    console.log('\n🎉 Regeneration complete!');
    console.log(`📊 Processed ${top25Words.length} words`);
    
  } catch (error) {
    console.error('❌ Error during regeneration:', error);
  }
}

// Run the regeneration
regenerateTop25Images().catch(console.error);
