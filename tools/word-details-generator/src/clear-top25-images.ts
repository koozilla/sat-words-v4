import { DatabaseClient } from './database-client';
import * as dotenv from 'dotenv';

dotenv.config();

async function clearTop25Images() {
  console.log('🗑️ Starting to clear existing images for top 25 words...');
  
  try {
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
    
    // Clear images for each word
    for (let i = 0; i < top25Words.length; i++) {
      const word = top25Words[i];
      console.log(`🗑️ Clearing images for word ${i + 1}/${top25Words.length}: "${word.word}"`);
      
      try {
        await dbClient.updateWordImages(word.id, [], []);
        console.log(`✅ Cleared images for "${word.word}"`);
      } catch (error) {
        console.error(`❌ Error clearing images for "${word.word}":`, error);
      }
    }
    
    console.log('\n🎉 Image clearing complete!');
    console.log(`📊 Processed ${top25Words.length} words`);
    
  } catch (error) {
    console.error('❌ Error during image clearing:', error);
  }
}

// Run the clearing
clearTop25Images().catch(console.error);
