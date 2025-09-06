// Script to create test data for test@sat-words.com user
const { createClient } = require('@supabase/supabase-js');

// You need to replace these with your actual Supabase credentials
const supabaseUrl = 'https://your-project.supabase.co'; // Your actual Supabase URL
const supabaseKey = 'your-service-role-key'; // Your actual service role key

const supabase = createClient(supabaseUrl, supabaseKey);

async function createTestDataForUser() {
  try {
    console.log('🔍 Creating test data for test@sat-words.com...');
    
    // First, get the user ID for test@sat-words.com
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, email')
      .eq('email', 'test@sat-words.com');

    if (usersError) {
      console.error('❌ Error fetching user:', usersError);
      return;
    }

    if (!users || users.length === 0) {
      console.log('❌ User test@sat-words.com not found in users table');
      console.log('💡 You may need to create the user first or check the email');
      return;
    }

    const userId = users[0].id;
    console.log(`✅ Found user: ${users[0].email} (ID: ${userId})`);

    // Check if user already has progress entries
    const { data: existingProgress, error: progressError } = await supabase
      .from('user_progress')
      .select('*')
      .eq('user_id', userId);

    if (progressError) {
      console.error('❌ Error checking existing progress:', progressError);
      return;
    }

    console.log(`📊 User already has ${existingProgress?.length || 0} progress entries`);

    if (existingProgress && existingProgress.length > 0) {
      console.log('Existing progress entries:');
      existingProgress.forEach((item, index) => {
        console.log(`${index + 1}. State: ${item.state}, Next review: ${item.next_review_date}`);
      });
    }

    // Get some words to add to the user's progress
    const { data: words, error: wordsError } = await supabase
      .from('words')
      .select('id, word, tier')
      .limit(5);

    if (wordsError) {
      console.error('❌ Error fetching words:', wordsError);
      return;
    }

    if (!words || words.length === 0) {
      console.log('❌ No words found in database');
      return;
    }

    console.log(`📚 Found ${words.length} words to add:`);
    words.forEach(word => console.log(`   - ${word.word} (${word.tier})`));

    // Create test data - some in 'started' state, some in 'ready' state
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    const testData = words.map((word, index) => {
      if (index < 2) {
        // First 2 words in 'ready' state (due for review)
        return {
          user_id: userId,
          word_id: word.id,
          state: 'ready',
          study_streak: 3,
          review_streak: 0,
          last_studied: yesterdayStr,
          next_review_date: yesterdayStr, // Due for review
          review_interval: 1
        };
      } else {
        // Rest in 'started' state (being studied)
        return {
          user_id: userId,
          word_id: word.id,
          state: 'started',
          study_streak: 1,
          review_streak: 0,
          last_studied: today,
          next_review_date: null,
          review_interval: 1
        };
      }
    });

    console.log('📝 Creating test progress entries...');
    
    const { data: inserted, error: insertError } = await supabase
      .from('user_progress')
      .upsert(testData, { 
        onConflict: 'user_id,word_id',
        ignoreDuplicates: false 
      })
      .select();

    if (insertError) {
      console.error('❌ Error inserting test data:', insertError);
      return;
    }

    console.log(`✅ Created/updated ${inserted?.length || 0} progress entries`);

    // Verify the data was created
    console.log('\n🔍 Verifying created data...');
    
    const { data: verifyData, error: verifyError } = await supabase
      .from('user_progress')
      .select(`
        id,
        state,
        next_review_date,
        review_interval,
        study_streak,
        review_streak,
        words:word_id (
          word,
          tier
        )
      `)
      .eq('user_id', userId)
      .order('state', { ascending: true });

    if (verifyError) {
      console.error('❌ Error verifying data:', verifyError);
      return;
    }

    console.log(`📊 Verification: Found ${verifyData?.length || 0} progress entries:`);
    verifyData?.forEach((item, index) => {
      console.log(`${index + 1}. ${item.words.word} (${item.words.tier})`);
      console.log(`   - State: ${item.state}`);
      console.log(`   - Study streak: ${item.study_streak}`);
      console.log(`   - Review streak: ${item.review_streak}`);
      console.log(`   - Next review: ${item.next_review_date || 'N/A'}`);
      console.log('');
    });

    console.log('🎉 Test data created successfully!');
    console.log('💡 Now log in as test@sat-words.com and try the review session!');

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

createTestDataForUser();
