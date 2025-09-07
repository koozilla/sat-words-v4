const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Use environment variables from the word details generator
const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
  console.error('SUPABASE_URL:', !!supabaseUrl);
  console.error('SUPABASE_SERVICE_ROLE_KEY:', !!supabaseKey);
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkMissingWords() {
  try {
    console.log('🔍 Checking which words from WORDS.md are missing from database...');
    
    // Read WORDS.md file
    const wordsFilePath = path.join(__dirname, 'docs/WORDS.md');
    const content = fs.readFileSync(wordsFilePath, 'utf8');
    
    // Parse words from WORDS.md
    const wordRegex = /\|\s*([A-Za-z]+)\s*\|\s*(Easy|Medium|Hard)\s*\|\s*(Top[0-9]+)\s*\|/g;
    const wordsFromFile = [];
    let match;
    
    while ((match = wordRegex.exec(content)) !== null) {
      const word = match[1].trim();
      const difficulty = match[2].trim();
      const tier = match[3].trim();
      
      if (word && word !== 'Word') {
        wordsFromFile.push({ word, difficulty, tier });
      }
    }
    
    console.log(`📊 Words in WORDS.md: ${wordsFromFile.length}`);
    
    // Get words from database
    const { data: dbWords, error } = await supabase
      .from('words')
      .select('word')
      .order('word');
    
    if (error) {
      console.error('Error fetching words from database:', error);
      return;
    }
    
    console.log(`📊 Words in database: ${dbWords.length}`);
    
    // Create set of database words for quick lookup
    const dbWordsSet = new Set(dbWords.map(w => w.word.toLowerCase()));
    
    // Find missing words
    const missingWords = wordsFromFile.filter(fileWord => 
      !dbWordsSet.has(fileWord.word.toLowerCase())
    );
    
    console.log(`\n❌ Words missing from database: ${missingWords.length}`);
    
    if (missingWords.length > 0) {
      console.log('\n📋 Missing words by tier:');
      
      // Group by tier
      const missingByTier = {};
      missingWords.forEach(word => {
        if (!missingByTier[word.tier]) {
          missingByTier[word.tier] = [];
        }
        missingByTier[word.tier].push(word);
      });
      
      // Display by tier
      Object.entries(missingByTier).forEach(([tier, words]) => {
        console.log(`\n🎯 ${tier}: ${words.length} missing words`);
        words.slice(0, 10).forEach((word, index) => {
          console.log(`   ${index + 1}. ${word.word} (${word.difficulty})`);
        });
        if (words.length > 10) {
          console.log(`   ... and ${words.length - 10} more`);
        }
      });
      
      // Show first 20 missing words overall
      console.log('\n📝 First 20 missing words:');
      missingWords.slice(0, 20).forEach((word, index) => {
        console.log(`${index + 1}. ${word.word} (${word.difficulty}, ${word.tier})`);
      });
      
      if (missingWords.length > 20) {
        console.log(`... and ${missingWords.length - 20} more`);
      }
      
      // Show percentage
      const percentage = ((missingWords.length / wordsFromFile.length) * 100).toFixed(1);
      console.log(`\n📊 Coverage: ${wordsFromFile.length - missingWords.length}/${wordsFromFile.length} words (${100 - percentage}%)`);
      console.log(`📊 Missing: ${missingWords.length}/${wordsFromFile.length} words (${percentage}%)`);
      
    } else {
      console.log('\n✅ All words from WORDS.md are present in the database!');
    }
    
    // Also check for words in database but not in WORDS.md
    const fileWordsSet = new Set(wordsFromFile.map(w => w.word.toLowerCase()));
    const extraWords = dbWords.filter(dbWord => 
      !fileWordsSet.has(dbWord.word.toLowerCase())
    );
    
    if (extraWords.length > 0) {
      console.log(`\n➕ Words in database but not in WORDS.md: ${extraWords.length}`);
      console.log('First 10 extra words:');
      extraWords.slice(0, 10).forEach((word, index) => {
        console.log(`${index + 1}. ${word.word}`);
      });
      if (extraWords.length > 10) {
        console.log(`... and ${extraWords.length - 10} more`);
      }
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

checkMissingWords();
