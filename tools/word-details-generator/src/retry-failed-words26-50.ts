import { ImageGenerator } from './image-generator';
import { DatabaseClient, DatabaseWordDetails } from './database-client';
import * as dotenv from 'dotenv';

dotenv.config();

async function retryFailedWords26to50() {
  console.log('🔄 Retrying image generation for failed words 26-50...');
  
  // List of words that failed in the previous attempt
  const failedWords = ['Volatile', 'Wane', 'Demagogue', 'Hedonist', 'Indolent', 'Ostentatious', 'Sagacious'];
  
  try {
    // Initialize clients
    const imageGenerator = new ImageGenerator('./output');
    const dbClient = new DatabaseClient();
    
    // Get all words from top_100 tier
    console.log('📚 Fetching words from database...');
    const words = await dbClient.getAllWords();
    const top100Words = words.filter(word => word.tier === 'top_100').slice(0, 25);
    
    // Filter to only the failed words
    const wordsToRetry = top100Words.filter(word => failedWords.includes(word.word));
    
    console.log(`Found ${wordsToRetry.length} words to retry: ${wordsToRetry.map(w => w.word).join(', ')}`);
    
    if (wordsToRetry.length === 0) {
      console.log('❌ No failed words found to retry');
      return;
    }
    
    // Process each word with longer delays to avoid rate limiting
    for (let i = 0; i < wordsToRetry.length; i++) {
      const word = wordsToRetry[i];
      console.log(`\n🎨 Retrying word ${i + 1}/${wordsToRetry.length}: "${word.word}"`);
      
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
        
        // Add longer delay between requests to avoid rate limiting
        if (i < wordsToRetry.length - 1) {
          console.log('⏳ Waiting 5 seconds before next word...');
          await new Promise(resolve => setTimeout(resolve, 5000));
        }
        
      } catch (error) {
        console.error(`❌ Error processing "${word.word}":`, error);
        // Continue with next word
      }
    }
    
    console.log('\n🎉 Retry complete for failed words 26-50!');
    console.log(`📊 Processed ${wordsToRetry.length} words`);
    
  } catch (error) {
    console.error('❌ Error during retry:', error);
  }
}

// Run the retry
retryFailedWords26to50().catch(console.error);
