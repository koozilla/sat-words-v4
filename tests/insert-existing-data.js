const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
require('dotenv').config();

async function insertExistingData() {
  console.log('🚀 Inserting existing word data into database...');
  
  // Initialize Supabase client
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase credentials');
  }
  
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  // Test connection
  console.log('🔍 Testing database connection...');
  const { data, error } = await supabase.from('words').select('count').limit(1);
  if (error) {
    throw new Error(`Database connection failed: ${error.message}`);
  }
  console.log('✅ Database connection successful');
  
  // Load existing progress data
  const progressPath = './output/progress.json';
  if (!fs.existsSync(progressPath)) {
    throw new Error('No progress.json file found. Run word generation first.');
  }
  
  const progress = JSON.parse(fs.readFileSync(progressPath, 'utf8'));
  console.log(`📊 Found ${progress.wordDetails.length} words to insert`);
  
  // Clear existing words if requested
  if (process.env.CLEAR_EXISTING_WORDS === 'true') {
    console.log('🗑️ Clearing existing words...');
    const { error: deleteError } = await supabase.from('words').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (deleteError) {
      console.warn('⚠️ Error clearing existing words:', deleteError.message);
    } else {
      console.log('✅ Existing words cleared');
    }
  }
  
  // Insert words in batches
  const batchSize = 50;
  let inserted = 0;
  
  for (let i = 0; i < progress.wordDetails.length; i += batchSize) {
    const batch = progress.wordDetails.slice(i, i + batchSize);
    
    const wordsToInsert = batch.map(word => ({
      word: word.word,
      definition: word.definition,
      part_of_speech: word.partOfSpeech,
      example_sentence: word.examples?.[0] || '',
      synonyms: word.synonyms || [],
      antonyms: word.antonyms || [],
      tier: word.tier,
      difficulty: word.difficulty,
      image_urls: [],
      image_descriptions: []
    }));
    
    console.log(`📝 Inserting batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(progress.wordDetails.length / batchSize)} (${batch.length} words)...`);
    
    const { data: insertedData, error: insertError } = await supabase
      .from('words')
      .insert(wordsToInsert)
      .select('id');
    
    if (insertError) {
      console.error(`❌ Error inserting batch:`, insertError.message);
      continue;
    }
    
    inserted += insertedData.length;
    console.log(`✅ Inserted ${insertedData.length} words (Total: ${inserted})`);
    
    // Small delay to avoid overwhelming the database
    if (i + batchSize < progress.wordDetails.length) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
  
  console.log('');
  console.log('🎉 Database insertion completed!');
  console.log(`📊 Successfully inserted ${inserted} words`);
  
  // Check total words in database
  const { count, error: countError } = await supabase
    .from('words')
    .select('*', { count: 'exact', head: true });
  
  if (!countError) {
    console.log(`📈 Total words in database: ${count}`);
  }
}

insertExistingData().catch(console.error);
