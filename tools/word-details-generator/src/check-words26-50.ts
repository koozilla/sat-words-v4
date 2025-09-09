import { DatabaseClient } from './database-client';
import * as dotenv from 'dotenv';

dotenv.config();

async function checkWords26to50() {
  console.log('🔍 Checking words 26-50 in database...');
  
  try {
    const dbClient = new DatabaseClient();
    
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
    
    if (words26to50.length > 0) {
      console.log('📋 Words 26-50:');
      words26to50.forEach((word, index) => {
        const hasImages = word.image_urls && word.image_urls.length > 0;
        console.log(`  ${index + 26}. ${word.word} (${word.tier}) - Images: ${hasImages ? word.image_urls.length : 0}`);
      });
      
      // Check how many already have images
      const wordsWithImages = words26to50.filter(word => word.image_urls && word.image_urls.length > 0);
      const wordsWithoutImages = words26to50.filter(word => !word.image_urls || word.image_urls.length === 0);
      
      console.log(`\n🎨 Words with images: ${wordsWithImages.length}`);
      console.log(`⚠️ Words without images: ${wordsWithoutImages.length}`);
      
      if (wordsWithoutImages.length > 0) {
        console.log('\n📋 Words that need images:');
        wordsWithoutImages.forEach((word, index) => {
          console.log(`  ${index + 1}. ${word.word} (${word.tier})`);
        });
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

if (require.main === module) {
  checkWords26to50();
}
