import { ImageGenerator } from './image-generator';
import { DatabaseClient } from './database-client';
import * as path from 'path';

async function generateTop175Images() {
  try {
    console.log('🚀 Generating images for all words in top_175 tier...');
    
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
    
    // Get all words from top_175 tier
    console.log('📚 Fetching all words from top_175 tier...');
    const words = await dbClient.getWordsByTier('top_175');
    
    if (!words || words.length === 0) {
      console.log('❌ No words found in top_175 tier');
      return;
    }
    
    console.log(`📊 Found ${words.length} words in top_175 tier`);
    
    let successCount = 0;
    let failCount = 0;
    
    for (let i = 0; i < words.length; i++) {
      const wordData = words[i];
      
      try {
        console.log(`\n📚 Processing word ${i + 1}/${words.length}: ${wordData.word}`);
        
        console.log(`✅ Word details:`);
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
          successCount++;
        } else {
          console.error(`❌ Failed to update database for ${wordData.word}`);
          failCount++;
        }
        
        // Add delay between requests to avoid rate limiting
        if (i < words.length - 1) {
          console.log('⏳ Waiting 2 seconds before next word...');
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
        
      } catch (error) {
        console.error(`❌ Error processing word "${wordData.word}":`, error);
        failCount++;
        continue;
      }
    }
    
    console.log('\n🎉 Image generation completed for top_175 tier!');
    console.log(`📊 Final Results:`);
    console.log(`   ✅ Successful: ${successCount}`);
    console.log(`   ❌ Failed: ${failCount}`);
    console.log(`   📈 Success Rate: ${((successCount / words.length) * 100).toFixed(1)}%`);
    
  } catch (error) {
    console.error('❌ Script failed:', error);
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  generateTop175Images();
}
