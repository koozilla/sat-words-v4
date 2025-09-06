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
    
    console.log('Configuration:');
    console.log(`- Words file: ${wordsFilePath}`);
    console.log(`- Output directory: ${outputDir}`);
    console.log(`- Batch size: ${batchSize}`);
    console.log(`- Delay between requests: ${delayBetweenRequests}ms`);
    console.log(`- Max retries: ${maxRetries}`);
    console.log('');
    
    // Validate environment
    if (!process.env.GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY environment variable is required');
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
