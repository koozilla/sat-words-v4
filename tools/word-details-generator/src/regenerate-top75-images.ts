import { ImageGenerator } from './image-generator';
import { DatabaseClient, DatabaseWordDetails } from './database-client';
import * as dotenv from 'dotenv';

dotenv.config();

async function regenerateTop75Images() {
  console.log('🔄 Regenerating images for words 51-75 (top_75 tier)...');
  
  try {
    // Initialize clients
    const imageGenerator = new ImageGenerator('./output');
    const dbClient = new DatabaseClient();
    
    // Get all words from top_75 tier
    console.log('📚 Fetching words from top_75 tier...');
    const allWords = await dbClient.getAllWords();
    const top75Words = allWords.filter(word => word.tier === 'top_75');
    
    console.log(`Found ${top75Words.length} words in top_75 tier`);
    
    if (top75Words.length === 0) {
      console.log('❌ No words found in top_75 tier');
      return;
    }
    
    // Process each word
    for (let i = 0; i < top75Words.length; i++) {
      const word = top75Words[i];
      console.log(`\n🎨 Processing word ${i + 1}/${top75Words.length}: "${word.word}"`);
      
      try {
        // Clear existing images first
        console.log(`🗑️ Clearing existing images for "${word.word}"`);
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
        if (i < top75Words.length - 1) {
          console.log('⏳ Waiting 3 seconds before next word...');
          await new Promise(resolve => setTimeout(resolve, 3000));
        }
        
      } catch (error) {
        console.error(`❌ Error processing "${word.word}":`, error);
        // Continue with next word
      }
    }
    
    console.log('\n🎉 Image regeneration complete for words 51-75!');
    console.log(`📊 Processed ${top75Words.length} words`);
    
  } catch (error) {
    console.error('❌ Error during image regeneration:', error);
  }
}

// Run the image regeneration
regenerateTop75Images().catch(console.error);
