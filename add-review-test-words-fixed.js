// Script to add test words for review with correct dates
const { createClient } = require('@supabase/supabase-js');

// You need to replace these with your actual Supabase credentials
const supabaseUrl = 'https://your-project.supabase.co'; // Your actual Supabase URL
const supabaseKey = 'your-service-role-key'; // Your actual service role key

const supabase = createClient(supabaseUrl, supabaseKey);

async function addReviewTestWords() {
  try {
    const testUserId = '11111111-1111-1111-1111-111111111111';
    
    console.log('🔍 Adding test words for review with correct dates...');
    
    // Get 5 words from the database
    const { data: words, error: wordsError } = await supabase
      .from('words')
      .select('id, word, tier')
      .limit(5);

    if (wordsError) {
      console.error('Error fetching words:', wordsError);
      return;
    }

    if (!words || words.length === 0) {
      console.log('❌ No words found in database');
      return;
    }

    console.log(`📚 Adding ${words.length} words to review:`);
    words.forEach(word => console.log(`   - ${word.word} (${word.tier})`));

    // Set next_review_date to today or earlier so they're due for review
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    // Create user progress entries for these words in 'ready' state
    const progressEntries = words.map((word, index) => ({
      user_id: testUserId,
      word_id: word.id,
      state: 'ready',
      study_streak: 3, // Already studied enough to be ready
      review_streak: 0,
      last_studied: yesterdayStr,
      next_review_date: index < 3 ? yesterdayStr : today, // Some due yesterday, some due today
      review_interval: 1
    }));

    console.log('📝 Inserting user progress entries...');
    
    const { data: inserted, error: insertError } = await supabase
      .from('user_progress')
      .upsert(progressEntries, { 
        onConflict: 'user_id,word_id',
        ignoreDuplicates: false 
      })
      .select();

    if (insertError) {
      console.error('Error inserting progress:', insertError);
      return;
    }

    console.log(`✅ Successfully added ${inserted?.length || progressEntries.length} words to review`);
    
    // Verify the data was created correctly
    console.log('🔍 Verifying created data...');
    
    const { data: verifyData, error: verifyError } = await supabase
      .from('user_progress')
      .select(`
        id,
        state,
        next_review_date,
        review_interval,
        words:word_id (
          word,
          tier
        )
      `)
      .eq('user_id', testUserId)
      .eq('state', 'ready')
      .lte('next_review_date', today);

    if (verifyError) {
      console.error('Error verifying data:', verifyError);
      return;
    }

    console.log(`📊 Verification: Found ${verifyData?.length || 0} words due for review:`);
    verifyData?.forEach((item, index) => {
      console.log(`${index + 1}. ${item.words.word} (${item.words.tier})`);
      console.log(`   - Next review: ${item.next_review_date}`);
      console.log(`   - Review interval: ${item.review_interval} days`);
    });

    console.log('🎉 Test data created successfully!');
    console.log('💡 Now try the review session - it should show these words!');

  } catch (error) {
    console.error('Error:', error);
  }
}

addReviewTestWords();
