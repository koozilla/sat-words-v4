import { ImageGenerator } from './image-generator';
import { DatabaseClient, DatabaseWordDetails } from './database-client';
import * as dotenv from 'dotenv';

dotenv.config();

async function generateTop100Images() {
  console.log('🎨 Generating images for words 76-100 (top_100 tier)...');
  
  try {
    // Initialize clients
    const imageGenerator = new ImageGenerator('./output');
    const dbClient = new DatabaseClient();
    
    // Get all words from top_100 tier
    console.log('📚 Fetching words from top_100 tier...');
    const allWords = await dbClient.getAllWords();
    const top100Words = allWords.filter(word => word.tier === 'top_100');
    
    console.log(`Found ${top100Words.length} words in top_100 tier`);
    
    if (top100Words.length === 0) {
      console.log('❌ No words found in top_100 tier');
      return;
    }
    
    // Filter words that don't have images yet
    const wordsWithoutImages = top100Words.filter(word => 
      !word.image_urls || word.image_urls.length === 0 || !word.image_urls[0]
    );
    
    console.log(`📊 Words without images: ${wordsWithoutImages.length}/${top100Words.length}`);
    
    if (wordsWithoutImages.length === 0) {
      console.log('✅ All words in top_100 tier already have images!');
      return;
    }
    
    // Process each word
    for (let i = 0; i < wordsWithoutImages.length; i++) {
      const word = wordsWithoutImages[i];
      console.log(`\n🎨 Processing word ${i + 1}/${wordsWithoutImages.length}: "${word.word}"`);
      
      try {
        // Generate image
        console.log(`🎨 Generating image for "${word.word}"`);
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
        if (i < wordsWithoutImages.length - 1) {
          console.log('⏳ Waiting 3 seconds before next word...');
          await new Promise(resolve => setTimeout(resolve, 3000));
        }
        
      } catch (error) {
        console.error(`❌ Error processing "${word.word}":`, error);
        // Continue with next word
      }
    }
    
    console.log('\n🎉 Image generation complete for words 76-100!');
    console.log(`📊 Processed ${wordsWithoutImages.length} words`);
    
  } catch (error) {
    console.error('❌ Error during image generation:', error);
  }
}

// Run the image generation
generateTop100Images().catch(console.error);
