import { ImageGenerator } from './image-generator';
import { DatabaseClient } from './database-client';
import * as path from 'path';

async function generateMissingTop150Images() {
  try {
    console.log('🚀 Generating images for missing words in top_150 tier...');
    
    // Test database connection first
    const dbClient = new DatabaseClient();
    const connectionTest = await dbClient.testConnection();
    
    if (!connectionTest) {
      console.error('❌ Database connection failed. Please check your environment variables.');
      process.exit(1);
    }
    
    // Set up output directory
    const outputDir = path.join(__dirname, '../output');
    
    // Create image generator
    const generator = new ImageGenerator(outputDir);
    
    // Words missing images in top_150
    const missingWords = ['Coalesce', 'Divulge'];
    
    for (const wordText of missingWords) {
      try {
        console.log(`\n📚 Processing word: ${wordText}`);
        
        // Fetch word details from database
        const wordData = await dbClient.getWordDetails(wordText);
        
        if (!wordData) {
          console.error(`❌ Word "${wordText}" not found in database`);
          continue;
        }
        
        console.log(`✅ Word details fetched:`);
        console.log(`   Word: ${wordData.word}`);
        console.log(`   Definition: ${wordData.definition}`);
        console.log(`   Difficulty: ${wordData.difficulty}`);
        console.log(`   Tier: ${wordData.tier}`);
        
        // Generate image
        console.log(`🎨 Generating image for ${wordData.word}...`);
        const result = await generator.generateWordImage(wordData);
        
        console.log(`\n📊 Results for ${wordData.word}:`);
        console.log('='.repeat(50));
        console.log(`Generated Image URL: ${result.imageUrl}`);
        console.log(`Generated Filename: ${result.fileName}`);
        console.log(`Generated Description: ${result.description}`);
        console.log('');
        
        // Update database with image URL and description
        console.log(`💾 Updating database with image URL and description...`);
        const updateResult = await dbClient.updateWordImages(wordData.id, [result.imageUrl], [result.description]);
        
        if (updateResult) {
          console.log(`✅ Database updated successfully for ${wordData.word}`);
        } else {
          console.error(`❌ Failed to update database for ${wordData.word}`);
        }
        
      } catch (error) {
        console.error(`❌ Error processing word "${wordText}":`, error);
        continue;
      }
    }
    
    console.log('\n🎉 Image generation completed for top_150 missing words!');
    
  } catch (error) {
    console.error('❌ Script failed:', error);
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  generateMissingTop150Images();
}
