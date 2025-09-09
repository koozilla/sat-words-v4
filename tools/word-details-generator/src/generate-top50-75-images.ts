import { ImageGenerator } from './image-generator';
import { DatabaseClient, DatabaseWordDetails } from './database-client';
import * as dotenv from 'dotenv';

dotenv.config();

async function generateImagesForTop50And75() {
  console.log('🎨 Generating images for top_50 and top_75 tiers...');
  
  try {
    // Initialize clients
    const imageGenerator = new ImageGenerator('./output');
    const dbClient = new DatabaseClient();
    
    // Get words from top_50 and top_75 tiers
    console.log('📚 Fetching words from top_50 and top_75 tiers...');
    const allWords = await dbClient.getAllWords();
    const top50Words = allWords.filter(word => word.tier === 'top_50');
    const top75Words = allWords.filter(word => word.tier === 'top_75');
    
    console.log(`Found ${top50Words.length} words in top_50 tier`);
    console.log(`Found ${top75Words.length} words in top_75 tier`);
    
    const wordsToProcess = [...top50Words, ...top75Words];
    console.log(`Total words to process: ${wordsToProcess.length}`);
    
    if (wordsToProcess.length === 0) {
      console.log('❌ No words found in top_50 and top_75 tiers');
      return;
    }
    
    // Process each word
    for (let i = 0; i < wordsToProcess.length; i++) {
      const word = wordsToProcess[i];
      console.log(`\n🎨 Processing word ${i + 1}/${wordsToProcess.length}: "${word.word}" (${word.tier})`);
      
      // Skip if already has image
      if (word.image_urls && word.image_urls.length > 0 && word.image_urls[0]) {
        console.log(`⏭️ Skipping "${word.word}" - already has image`);
        continue;
      }
      
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
        if (i < wordsToProcess.length - 1) {
          console.log('⏳ Waiting 3 seconds before next word...');
          await new Promise(resolve => setTimeout(resolve, 3000));
        }
        
      } catch (error) {
        console.error(`❌ Error processing "${word.word}":`, error);
        // Continue with next word
      }
    }
    
    console.log('\n🎉 Image generation complete for top_50 and top_75 tiers!');
    
  } catch (error) {
    console.error('❌ Error during image generation:', error);
  }
}

// Run the image generation
generateImagesForTop50And75().catch(console.error);
