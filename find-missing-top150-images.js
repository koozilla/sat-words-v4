const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables. Please check your .env.local file.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function findMissingImagesInTop150() {
  try {
    console.log('🔍 Finding words missing images in top_150 tier...\n');

    // Get all words from top_150 tier
    const { data: words, error } = await supabase
      .from('words')
      .select('id, word, definition, image_urls')
      .eq('tier', 'top_150')
      .order('word');

    if (error) {
      console.error('Error fetching words:', error);
      return;
    }

    if (!words || words.length === 0) {
      console.log('No words found in top_150 tier.');
      return;
    }

    // Find words without images
    const wordsWithoutImages = words.filter(word => 
      !word.image_urls || 
      word.image_urls.length === 0 || 
      !word.image_urls[0] || 
      word.image_urls[0].trim() === ''
    );

    console.log(`📊 Top 150 Analysis:`);
    console.log(`   Total words: ${words.length}`);
    console.log(`   Words with images: ${words.length - wordsWithoutImages.length}`);
    console.log(`   Words without images: ${wordsWithoutImages.length}\n`);

    if (wordsWithoutImages.length > 0) {
      console.log('🎯 Words missing images:');
      wordsWithoutImages.forEach((word, index) => {
        console.log(`   ${index + 1}. ${word.word} - ${word.definition}`);
      });
      
      return wordsWithoutImages;
    } else {
      console.log('✅ All words in top_150 have images!');
      return [];
    }

  } catch (error) {
    console.error('Error:', error);
    return [];
  }
}

findMissingImagesInTop150();
