import { DatabaseClient } from './database-client';

async function checkAvailableWords() {
  try {
    console.log('🔍 Checking available words in database...');
    
    const dbClient = new DatabaseClient();
    const connectionTest = await dbClient.testConnection();
    
    if (!connectionTest) {
      console.error('❌ Database connection failed');
      process.exit(1);
    }
    
    // Get all words
    const allWords = await dbClient.getAllWords();
    
    console.log(`📊 Total words in database: ${allWords.length}`);
    console.log('');
    
    // Show first 10 words
    console.log('📚 First 10 words:');
    allWords.slice(0, 10).forEach((word, index) => {
      console.log(`${index + 1}. ${word.word} (${word.difficulty}, ${word.tier})`);
    });
    
    console.log('');
    
    // Check if benevolent exists
    const benevolent = allWords.find(w => w.word.toLowerCase() === 'benevolent');
    if (benevolent) {
      console.log('✅ Found benevolent:', benevolent);
    } else {
      console.log('❌ Benevolent not found');
      
      // Look for similar words
      const similar = allWords.filter(w => 
        w.word.toLowerCase().includes('ben') || 
        w.word.toLowerCase().includes('volent')
      );
      
      if (similar.length > 0) {
        console.log('🔍 Similar words found:');
        similar.forEach(word => {
          console.log(`   - ${word.word} (${word.difficulty}, ${word.tier})`);
        });
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

if (require.main === module) {
  checkAvailableWords();
}
