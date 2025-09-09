import { ImageGenerator } from './image-generator';
import { DatabaseClient } from './database-client';
import * as path from 'path';

async function testSingleWordImage() {
  try {
    console.log('🚀 Starting single word image generation test...');
    
    // Test database connection first
    const dbClient = new DatabaseClient();
    const connectionTest = await dbClient.testConnection();
    
    if (!connectionTest) {
      console.error('❌ Database connection failed. Please check your environment variables.');
      process.exit(1);
    }
    
    // Fetch word details from database
    console.log('📚 Fetching word details from database...');
    const testWord = await dbClient.getWordDetails('Benevolent');
    
    if (!testWord) {
      console.error('❌ Word "Benevolent" not found in database');
      process.exit(1);
    }
    
    console.log('✅ Word details fetched successfully:');
    console.log(`   Word: ${testWord.word}`);
    console.log(`   Definition: ${testWord.definition}`);
    console.log(`   Difficulty: ${testWord.difficulty}`);
    console.log(`   Tier: ${testWord.tier}`);
    console.log(`   Synonyms: ${testWord.synonyms.join(', ')}`);
    console.log('');
    
    // Set up output directory
    const outputDir = path.join(__dirname, '../output');
    
    // Create image generator
    const generator = new ImageGenerator(outputDir);
    
    // Generate image
    const result = await generator.generateWordImage(testWord);
    
    console.log('\n📊 Results:');
    console.log('='.repeat(50));
    console.log(`Word: ${testWord.word}`);
    console.log(`Definition: ${testWord.definition}`);
    console.log(`Difficulty: ${testWord.difficulty}`);
    console.log(`Tier: ${testWord.tier}`);
    console.log('');
    console.log(`Generated Image URL: ${result.imageUrl}`);
    console.log(`Generated Filename: ${result.fileName}`);
    console.log(`Generated Description: ${result.description}`);
    console.log('');
    console.log('✅ Test completed successfully!');
    
    // Expected output format:
    // Generated Image URL: /path/to/output/images/benevolent-2025-01-15-14-30-25.svg
    // Generated Filename: benevolent-2025-01-15-14-30-25.svg
    // Generated Description: "This image helps remember 'benevolent' because..."
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

// Run the test
if (require.main === module) {
  testSingleWordImage();
}
