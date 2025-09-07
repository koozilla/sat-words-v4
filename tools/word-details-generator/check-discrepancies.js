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

async function checkWordDiscrepancies() {
  try {
    console.log('🔍 Checking discrepancies between WORDS.md and database...');
    
    // Read WORDS.md file
    const wordsFilePath = path.join(__dirname, '../../docs/WORDS.md');
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
      .select('*')
      .order('word');
    
    if (error) {
      console.error('Error fetching words from database:', error);
      return;
    }
    
    console.log(`📊 Words in database: ${dbWords.length}`);
    
    // Create maps for comparison
    const fileWordsMap = new Map();
    wordsFromFile.forEach(w => {
      fileWordsMap.set(w.word.toLowerCase(), w);
    });
    
    // Find discrepancies
    const discrepancies = [];
    const wordsToUpdate = [];
    
    // Check each word in database
    dbWords.forEach(dbWord => {
      const fileWord = fileWordsMap.get(dbWord.word.toLowerCase());
      
      if (fileWord) {
        // Word exists in both, check for differences
        const differences = [];
        
        if (dbWord.difficulty !== fileWord.difficulty.toLowerCase()) {
          differences.push(`difficulty: ${dbWord.difficulty} → ${fileWord.difficulty}`);
        }
        
        if (dbWord.tier !== fileWord.tier) {
          differences.push(`tier: ${dbWord.tier} → ${fileWord.tier}`);
        }
        
        if (differences.length > 0) {
          discrepancies.push({
            word: dbWord.word,
            differences,
            current: {
              difficulty: dbWord.difficulty,
              tier: dbWord.tier
            },
            expected: {
              difficulty: fileWord.difficulty,
              tier: fileWord.tier
            }
          });
          
          wordsToUpdate.push({
            id: dbWord.id,
            word: dbWord.word,
            difficulty: fileWord.difficulty,
            tier: fileWord.tier
          });
        }
      }
    });
    
    console.log('\n📋 Discrepancy Summary:');
    console.log(`- Words with differences: ${discrepancies.length}`);
    console.log(`- Words to update: ${wordsToUpdate.length}`);
    
    if (discrepancies.length > 0) {
      console.log('\n🔄 Words with discrepancies:');
      discrepancies.slice(0, 10).forEach((item, index) => {
        console.log(`${index + 1}. ${item.word}:`);
        item.differences.forEach(diff => {
          console.log(`   - ${diff}`);
        });
      });
      
      if (discrepancies.length > 10) {
        console.log(`... and ${discrepancies.length - 10} more`);
      }
      
      // Update words in database
      console.log('\n🔄 Updating words in database...');
      
      for (const wordUpdate of wordsToUpdate) {
        const { error: updateError } = await supabase
          .from('words')
          .update({
            difficulty: wordUpdate.difficulty,
            tier: wordUpdate.tier
          })
          .eq('id', wordUpdate.id);
        
        if (updateError) {
          console.error(`Error updating ${wordUpdate.word}:`, updateError);
        } else {
          console.log(`✅ Updated ${wordUpdate.word}: ${wordUpdate.difficulty}, ${wordUpdate.tier}`);
        }
      }
      
      console.log(`\n✅ Updated ${wordsToUpdate.length} words in database`);
    } else {
      console.log('\n✅ No words need updating - database is in sync with WORDS.md');
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

checkWordDiscrepancies();
