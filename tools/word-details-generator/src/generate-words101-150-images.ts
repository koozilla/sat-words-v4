import { ImageGenerator } from './image-generator';
import { DatabaseClient, DatabaseWordDetails } from './database-client';
import * as dotenv from 'dotenv';

dotenv.config();

async function generateWords101to150Images() {
  console.log('🎨 Generating images for words 101-150...');
  
  try {
    // Initialize clients
    const imageGenerator = new ImageGenerator('./output');
    const dbClient = new DatabaseClient();
    
    // Get all words and find words 101-150
    console.log('📚 Fetching all words from database...');
    const allWords = await dbClient.getAllWords();
    
    if (allWords.length < 150) {
      console.log('❌ Not enough words in database (need at least 150)');
      return;
    }
    
    // Get words 101-150 (slice from index 100 to 149)
    const words101to150 = allWords.slice(100, 150);
    
    console.log(`Found ${words101to150.length} words (101-150)`);
    console.log('Words to process:', words101to150.map(w => w.word).join(', '));
    
    // Filter words that don't have images yet
    const wordsWithoutImages = words101to150.filter(word => 
      !word.image_urls || word.image_urls.length === 0 || !word.image_urls[0]
    );
    
    console.log(`📊 Words without images: ${wordsWithoutImages.length}/${words101to150.length}`);
    
    if (wordsWithoutImages.length === 0) {
      console.log('✅ All words 101-150 already have images!');
      return;
    }
    
    // Process each word
    for (let i = 0; i < wordsWithoutImages.length; i++) {
      const word = wordsWithoutImages[i];
      const wordNumber = 101 + words101to150.findIndex(w => w.id === word.id);
      
      console.log(`\n🎨 Processing word ${wordNumber}: "${word.word}" (${word.tier})`);
      
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
    
    console.log('\n🎉 Image generation complete for words 101-150!');
    console.log(`📊 Processed ${wordsWithoutImages.length} words`);
    
  } catch (error) {
    console.error('❌ Error during image generation:', error);
  }
}

// Run the image generation
generateWords101to150Images().catch(console.error);
