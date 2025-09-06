// Debug script to check review words
const { createClient } = require('@supabase/supabase-js');

// You need to replace these with your actual Supabase credentials
const supabaseUrl = 'https://your-project.supabase.co'; // Your actual Supabase URL
const supabaseKey = 'your-service-role-key'; // Your actual service role key

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugReviewWords() {
  try {
    const testUserId = '11111111-1111-1111-1111-111111111111';
    
    console.log('🔍 Debugging review words detection...');
    console.log('📅 Today:', new Date().toISOString().split('T')[0]);
    
    // Check all words in 'ready' state
    const { data: allReadyWords, error: allError } = await supabase
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
      .eq('state', 'ready');

    if (allError) {
      console.error('Error fetching ready words:', allError);
      return;
    }

    console.log(`📊 Found ${allReadyWords?.length || 0} words in 'ready' state:`);
    
    if (allReadyWords && allReadyWords.length > 0) {
      allReadyWords.forEach((word, index) => {
        const isDue = word.next_review_date <= new Date().toISOString().split('T')[0];
        console.log(`${index + 1}. ${word.words.word} (${word.words.tier})`);
        console.log(`   - Next review: ${word.next_review_date}`);
        console.log(`   - Review interval: ${word.review_interval} days`);
        console.log(`   - Study streak: ${word.study_streak}`);
        console.log(`   - Review streak: ${word.review_streak}`);
        console.log(`   - Is due: ${isDue ? '✅ YES' : '❌ NO'}`);
        console.log('');
      });
    } else {
      console.log('❌ No words found in "ready" state');
    }

    // Now check what the actual query returns (mimicking getWordsDueForReview)
    console.log('🔍 Testing actual review query...');
    
    const today = new Date().toISOString().split('T')[0];
    
    const { data: dueWords, error: dueError } = await supabase
      .from('user_progress')
      .select(`
        *,
        words (
          id,
          word,
          definition,
          part_of_speech,
          tier,
          difficulty,
          image_urls,
          synonyms,
          antonyms,
          example_sentence
        )
      `)
      .eq('user_id', testUserId)
      .eq('state', 'ready')
      .lte('next_review_date', today)
      .order('next_review_date', { ascending: true });

    if (dueError) {
      console.error('Error fetching due words:', dueError);
      return;
    }

    console.log(`📊 Query returned ${dueWords?.length || 0} words due for review:`);
    
    if (dueWords && dueWords.length > 0) {
      dueWords.forEach((word, index) => {
        console.log(`${index + 1}. ${word.words.word} (${word.words.tier})`);
        console.log(`   - Next review: ${word.next_review_date}`);
        console.log(`   - Review interval: ${word.review_interval} days`);
      });
    } else {
      console.log('❌ No words returned by the review query');
      console.log('💡 This means the review session will show "No Words Due for Review"');
    }

  } catch (error) {
    console.error('Error:', error);
  }
}

debugReviewWords();
