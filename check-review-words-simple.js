// Simple script to check review words
// Run this with: node check-review-words-simple.js

const { createClient } = require('@supabase/supabase-js');

// You need to replace these with your actual Supabase credentials
const supabaseUrl = 'https://your-project.supabase.co'; // Replace with your actual URL
const supabaseKey = 'your-service-role-key'; // Replace with your actual service role key

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkReviewWords() {
  try {
    const testUserId = '11111111-1111-1111-1111-111111111111';
    
    console.log('🔍 Checking words available for review...');
    
    // Check words in 'ready' state that are due for review
    const today = new Date().toISOString().split('T')[0];
    
    const { data: readyWords, error: readyError } = await supabase
      .from('user_progress')
      .select(`
        id,
        state,
        next_review_date,
        review_interval,
        study_streak,
        review_streak,
        words:word_id (
          id,
          word,
          definition,
          tier
        )
      `)
      .eq('user_id', testUserId)
      .eq('state', 'ready')
      .lte('next_review_date', today);

    if (readyError) {
      console.error('Error fetching ready words:', readyError);
      return;
    }

    console.log(`📊 Found ${readyWords?.length || 0} words due for review:`);
    
    if (readyWords && readyWords.length > 0) {
      readyWords.forEach((word, index) => {
        console.log(`${index + 1}. ${word.words.word} (${word.words.tier})`);
        console.log(`   - Next review: ${word.next_review_date}`);
        console.log(`   - Review interval: ${word.review_interval} days`);
        console.log(`   - Study streak: ${word.study_streak}`);
        console.log(`   - Review streak: ${word.review_streak}`);
        console.log('');
      });
    } else {
      console.log('❌ No words found due for review');
      console.log('💡 You need to create test data first or complete study sessions');
    }

    // Check all user progress for this user
    console.log('🔍 Checking all user progress for test user...');
    
    const { data: allProgress, error: allError } = await supabase
      .from('user_progress')
      .select(`
        id,
        state,
        next_review_date,
        review_interval,
        study_streak,
        review_streak,
        words:word_id (
          id,
          word,
          definition,
          tier
        )
      `)
      .eq('user_id', testUserId);

    if (allError) {
      console.error('Error fetching all progress:', allError);
      return;
    }

    console.log(`📊 Total progress entries: ${allProgress?.length || 0}`);
    
    if (allProgress && allProgress.length > 0) {
      const stateCounts = allProgress.reduce((acc, item) => {
        acc[item.state] = (acc[item.state] || 0) + 1;
        return acc;
      }, {});
      
      console.log('📈 State distribution:');
      Object.entries(stateCounts).forEach(([state, count]) => {
        console.log(`   - ${state}: ${count} words`);
      });
    }

  } catch (error) {
    console.error('Error:', error);
  }
}

checkReviewWords();
