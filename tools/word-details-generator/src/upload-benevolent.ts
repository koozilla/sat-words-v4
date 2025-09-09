import { DatabaseClient } from './database-client';
import { ImageGenerator } from './image-generator';
import * as path from 'path';

async function uploadBenevolentImage() {
  try {
    console.log('🚀 Uploading image for "Benevolent" to database...');
    
    // Test database connection
    const dbClient = new DatabaseClient();
    const connectionTest = await dbClient.testConnection();
    
    if (!connectionTest) {
      console.error('❌ Database connection failed');
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
    console.log(`   Current images: ${testWord.image_urls.length} URLs`);
    console.log('');
    
    // Set up output directory
    const outputDir = path.join(__dirname, '../output');
    
    // Create image generator
    const generator = new ImageGenerator(outputDir);
    
    // Generate image
    console.log('🎨 Generating image...');
    const result = await generator.generateWordImage(testWord);
    
    console.log('✅ Image generated successfully!');
    console.log(`   Image URL: ${result.imageUrl}`);
    console.log(`   Filename: ${result.fileName}`);
    console.log(`   Description: ${result.description}`);
    console.log('');
    
    // Update database with new image
    console.log('💾 Updating database...');
    const success = await dbClient.updateWordImages(
      testWord.id,
      [result.imageUrl], // Single image URL
      [result.description] // Single description
    );
    
    if (success) {
      console.log('✅ Database updated successfully!');
      console.log('');
      console.log('📊 Final Results:');
      console.log('='.repeat(50));
      console.log(`Word: ${testWord.word}`);
      console.log(`Definition: ${testWord.definition}`);
      console.log(`Image URL: ${result.imageUrl}`);
      console.log(`Description: ${result.description}`);
      console.log('');
      console.log('🎉 Image upload completed successfully!');
    } else {
      console.error('❌ Failed to update database');
      process.exit(1);
    }
    
  } catch (error) {
    console.error('❌ Upload failed:', error);
    process.exit(1);
  }
}

// Run the upload
if (require.main === module) {
  uploadBenevolentImage();
}
