import { ContentGenerator } from './content-generator';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config();

async function main() {
  try {
    console.log('🚀 Starting Word Details Generator...');
    
    // Configuration
    const wordsFilePath = process.env.WORDS_FILE_PATH || path.join(__dirname, '../../WORDS.md');
    const outputDir = process.env.OUTPUT_DIR || path.join(__dirname, '../output');
    const batchSize = parseInt(process.env.BATCH_SIZE || '10');
    const delayBetweenRequests = parseInt(process.env.DELAY_BETWEEN_REQUESTS || '1000');
    const maxRetries = parseInt(process.env.MAX_RETRIES || '3');
    const insertToDatabase = process.env.INSERT_TO_DATABASE === 'true';
    const clearExistingWords = process.env.CLEAR_EXISTING_WORDS === 'true';
    
    console.log('Configuration:');
    console.log(`- Words file: ${wordsFilePath}`);
    console.log(`- Output directory: ${outputDir}`);
    console.log(`- Batch size: ${batchSize}`);
    console.log(`- Delay between requests: ${delayBetweenRequests}ms`);
    console.log(`- Max retries: ${maxRetries}`);
    console.log(`- Insert to database: ${insertToDatabase}`);
    console.log(`- Clear existing words: ${clearExistingWords}`);
    console.log('');
    
    // Validate environment
    if (!process.env.GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY environment variable is required');
    }
    
    if (insertToDatabase) {
      if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
        throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables are required for database insertion');
      }
    }
    
    // Create content generator
    const generator = new ContentGenerator(
      wordsFilePath,
      outputDir,
      batchSize,
      delayBetweenRequests,
      maxRetries
    );
    
    // Generate word details
    const wordDetails = await generator.generateAllWordDetails();
    
    console.log('');
    console.log('✅ Word details generation completed successfully!');
    console.log(`📊 Generated details for ${wordDetails.length} words`);
    console.log(`📁 Results saved to: ${outputDir}`);
    console.log('');
    console.log('Files created:');
    console.log('- word-details.json (complete results)');
    console.log('- word-details.csv (CSV format)');
    console.log('- progress.json (final progress)');
    console.log('- parsed-words.json (original word list)');
    console.log('- parsed-words.csv (original word list CSV)');
    console.log('- [tier].json (words grouped by tier)');
    
    if (insertToDatabase) {
      console.log('');
      console.log('🗄️ Words have been inserted into the database');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

// Run the main function
if (require.main === module) {
  main();
}
