import { ImageGenerator } from './image-generator';
import { DatabaseClient, DatabaseWordDetails } from './database-client';
import * as dotenv from 'dotenv';

dotenv.config();

async function generateWords26to50Images() {
  console.log('🎨 Generating images for words 26-50...');
  
  try {
    const dbClient = new DatabaseClient();
    const imageGenerator = new ImageGenerator('./output');
    
    // Test connection first
    console.log('📡 Testing database connection...');
    const connectionOk = await dbClient.testConnection();
    if (!connectionOk) {
      console.error('❌ Database connection failed');
      return;
    }
    
    // Get all words
    console.log('📝 Fetching all words from database...');
    const allWords = await dbClient.getAllWords();
    
    // Sort by tier to get words 26-50
    const sortedWords = allWords.sort((a, b) => {
      const tierOrder = ['top_25', 'top_50', 'top_100', 'top_200', 'top_300', 'top_400', 'top_500'];
      return tierOrder.indexOf(a.tier) - tierOrder.indexOf(b.tier);
    });
    
    // Get words 26-50 (indices 25-49)
    const words26to50 = sortedWords.slice(25, 50);
    
    console.log(`📊 Found ${words26to50.length} words in positions 26-50`);
    
    if (words26to50.length === 0) {
      console.log('❌ No words found in positions 26-50');
      return;
    }
    
    let successCount = 0;
    let errorCount = 0;
    
    for (let i = 0; i < words26to50.length; i++) {
      const word = words26to50[i];
      console.log(`\n🎨 Processing word ${i + 26}/${50}: "${word.word}"`);
      
      try {
        // Generate image
        console.log(`  📝 Generating image for "${word.word}"...`);
        const result = await imageGenerator.generateWordImage(word);
        
        console.log(`  ✅ Image generated successfully!`);
        console.log(`  📊 Image URL: ${result.imageUrl}`);
        console.log(`  📝 Description: ${result.description}`);
        
        // Update database
        console.log(`  💾 Updating database...`);
        const updatedImageUrls = [...(word.image_urls || []), result.imageUrl];
        const updatedImageDescriptions = [...(word.image_descriptions || []), result.description];
        
        const updateSuccess = await dbClient.updateWordImages(
          word.id, 
          updatedImageUrls, 
          updatedImageDescriptions
        );
        
        if (updateSuccess) {
          console.log(`  ✅ Database updated successfully!`);
          successCount++;
        } else {
          console.log(`  ❌ Failed to update database`);
          errorCount++;
        }
        
        // Add delay between requests to avoid rate limiting
        if (i < words26to50.length - 1) {
          console.log(`  ⏳ Waiting 2 seconds before next word...`);
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
        
      } catch (error) {
        console.error(`  ❌ Error processing "${word.word}":`, error);
        errorCount++;
      }
    }
    
    console.log(`\n🎉 Image generation complete!`);
    console.log(`✅ Successfully processed: ${successCount} words`);
    console.log(`❌ Errors: ${errorCount} words`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

if (require.main === module) {
  generateWords26to50Images();
}
