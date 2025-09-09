import { ImageGenerator } from './image-generator';
import { DatabaseClient, DatabaseWordDetails } from './database-client';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';

dotenv.config();

async function generateImagesForMissingTop100Words() {
  console.log('🎨 Generating images for missing top 100 words...');
  
  try {
    // Initialize clients
    const imageGenerator = new ImageGenerator('./output');
    const dbClient = new DatabaseClient();
    
    // Initialize Supabase client for direct database operations
    const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase URL and key are required');
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Read top-100.json to get all words that should be in the database
    console.log('📚 Reading top-100.json...');
    const top100Words = JSON.parse(fs.readFileSync('./output/top-100.json', 'utf8'));
    console.log(`Found ${top100Words.length} words in top-100.json`);
    
    // Get existing words from database
    console.log('📚 Fetching existing words from database...');
    const existingWords = await dbClient.getAllWords();
    const existingWordSet = new Set(existingWords.map(w => w.word));
    
    // Find words that are missing from database
    const missingWords = top100Words.filter((word: any) => !existingWordSet.has(word.word));
    console.log(`Found ${missingWords.length} words missing from database`);
    
    if (missingWords.length === 0) {
      console.log('✅ All top 100 words are already in the database');
      
      // Check which existing words are missing images
      const top100DbWords = existingWords.filter(word => word.tier === 'top_100');
      const wordsWithoutImages = top100DbWords.filter(word => 
        !word.image_urls || word.image_urls.length === 0 || !word.image_urls[0]
      );
      
      console.log(`Found ${wordsWithoutImages.length} words without images`);
      
      if (wordsWithoutImages.length === 0) {
        console.log('🎉 All top 100 words already have images!');
        return;
      }
      
      // Generate images for words without images
      console.log(`🎨 Generating images for ${wordsWithoutImages.length} words without images...`);
      
      for (let i = 0; i < wordsWithoutImages.length; i++) {
        const word = wordsWithoutImages[i];
        console.log(`\n🎨 Processing word ${i + 1}/${wordsWithoutImages.length}: "${word.word}"`);
        
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
          
          // Add delay between requests to avoid rate limiting
          if (i < wordsWithoutImages.length - 1) {
            console.log('⏳ Waiting 3 seconds before next word...');
            await new Promise(resolve => setTimeout(resolve, 3000));
          }
          
        } catch (error) {
          console.error(`❌ Error processing "${word.word}":`, error);
          // Continue with next word
        }
      }
      
      console.log('\n🎉 Image generation complete for missing images!');
      return;
    }
    
    // First, add missing words to database
    console.log(`📝 Adding ${missingWords.length} missing words to database...`);
    
    for (let i = 0; i < missingWords.length; i++) {
      const wordData = missingWords[i];
      console.log(`\n📝 Adding word ${i + 1}/${missingWords.length}: "${wordData.word}"`);
      
      try {
        const { error } = await supabase
          .from('words')
          .insert({
            word: wordData.word,
            definition: wordData.definition,
            part_of_speech: wordData.partOfSpeech,
            example_sentence: wordData.examples[0], // Use first example
            synonyms: wordData.synonyms,
            antonyms: wordData.antonyms,
            tier: 'top_100',
            difficulty: wordData.difficulty, // Keep original case
            image_urls: [],
            image_descriptions: []
          });
        
        if (error) {
          console.error(`❌ Error adding "${wordData.word}":`, error);
        } else {
          console.log(`✅ Successfully added "${wordData.word}" to database`);
        }
        
        // Add delay between database operations
        if (i < missingWords.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
      } catch (error) {
        console.error(`❌ Error adding "${wordData.word}":`, error);
        // Continue with next word
      }
    }
    
    console.log('\n🎉 All missing words added to database!');
    console.log('🎨 Now generating images for all top 100 words...');
    
    // Now generate images for all top 100 words
    const allTop100Words = await dbClient.getAllWords();
    const top100WordsInDb = allTop100Words.filter(word => word.tier === 'top_100');
    
    console.log(`Found ${top100WordsInDb.length} words in top_100 tier`);
    
    for (let i = 0; i < top100WordsInDb.length; i++) {
      const word = top100WordsInDb[i];
      console.log(`\n🎨 Processing word ${i + 1}/${top100WordsInDb.length}: "${word.word}"`);
      
      // Skip if already has image
      if (word.image_urls && word.image_urls.length > 0 && word.image_urls[0]) {
        console.log(`⏭️ Skipping "${word.word}" - already has image`);
        continue;
      }
      
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
        
        // Add delay between requests to avoid rate limiting
        if (i < top100WordsInDb.length - 1) {
          console.log('⏳ Waiting 3 seconds before next word...');
          await new Promise(resolve => setTimeout(resolve, 3000));
        }
        
      } catch (error) {
        console.error(`❌ Error processing "${word.word}":`, error);
        // Continue with next word
      }
    }
    
    console.log('\n🎉 Image generation complete for all top 100 words!');
    
  } catch (error) {
    console.error('❌ Error during image generation:', error);
  }
}

// Run the image generation
generateImagesForMissingTop100Words().catch(console.error);
