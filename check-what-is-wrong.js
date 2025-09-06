// Simple script to check what's wrong
const { createClient } = require('@supabase/supabase-js');

// You need to replace these with your actual Supabase credentials
const supabaseUrl = 'https://your-project.supabase.co'; // Your actual Supabase URL
const supabaseKey = 'your-service-role-key'; // Your actual service role key

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkWhatIsWrong() {
  try {
    const testUserId = '11111111-1111-1111-1111-111111111111';
    
    console.log('🔍 Checking what is wrong...');
    console.log('📅 Today:', new Date().toISOString().split('T')[0]);
    
    // Check if there are any words at all
    const { data: words, error: wordsError } = await supabase
      .from('words')
      .select('id, word')
      .limit(3);

    if (wordsError) {
      console.error('❌ Error fetching words:', wordsError);
      return;
    }

    console.log(`📚 Words in database: ${words?.length || 0}`);
    if (words && words.length > 0) {
      console.log('Sample words:', words.map(w => w.word).join(', '));
    }

    // Check if there are any user_progress entries at all
    const { data: allProgress, error: allError } = await supabase
      .from('user_progress')
      .select('user_id, state, word_id')
      .limit(5);

    if (allError) {
      console.error('❌ Error fetching user_progress:', allError);
      return;
    }

    console.log(`📊 User progress entries: ${allProgress?.length || 0}`);
    if (allProgress && allProgress.length > 0) {
      console.log('Sample entries:', allProgress.map(p => `${p.user_id.slice(0,8)}... - ${p.state}`));
    }

    // Check specifically for our test user
    const { data: testUserProgress, error: testUserError } = await supabase
      .from('user_progress')
      .select('*')
      .eq('user_id', testUserId);

    if (testUserError) {
      console.error('❌ Error fetching test user progress:', testUserError);
      return;
    }

    console.log(`👤 Test user progress entries: ${testUserProgress?.length || 0}`);
    
    if (testUserProgress && testUserProgress.length > 0) {
      console.log('Test user entries:');
      testUserProgress.forEach((item, index) => {
        console.log(`${index + 1}. State: ${item.state}, Next review: ${item.next_review_date}`);
      });
    } else {
      console.log('❌ No progress entries found for test user');
      console.log('💡 This is likely the problem - we need to create test data');
    }

    // If no test data exists, create some
    if (!testUserProgress || testUserProgress.length === 0) {
      console.log('\n🔧 Creating test data...');
      
      if (!words || words.length === 0) {
        console.log('❌ No words in database to create test data with');
        return;
      }

      // Create test data for the first 3 words
      const testData = words.slice(0, 3).map(word => ({
        user_id: testUserId,
        word_id: word.id,
        state: 'ready',
        study_streak: 3,
        review_streak: 0,
        last_studied: new Date().toISOString().split('T')[0],
        next_review_date: new Date().toISOString().split('T')[0], // Due today
        review_interval: 1
      }));

      const { data: inserted, error: insertError } = await supabase
        .from('user_progress')
        .insert(testData)
        .select();

      if (insertError) {
        console.error('❌ Error inserting test data:', insertError);
        return;
      }

      console.log(`✅ Created ${inserted?.length || 0} test progress entries`);
      console.log('🎉 Test data created! Now try the review session again.');
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

checkWhatIsWrong();
