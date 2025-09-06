// Debug script to check what's actually in the database
const { createClient } = require('@supabase/supabase-js');

// You need to replace these with your actual Supabase credentials
const supabaseUrl = 'https://your-project.supabase.co'; // Your actual Supabase URL
const supabaseKey = 'your-service-role-key'; // Your actual service role key

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugDatabase() {
  try {
    const testUserId = '11111111-1111-1111-1111-111111111111';
    
    console.log('🔍 Debugging database connection and data...');
    console.log('📅 Today:', new Date().toISOString().split('T')[0]);
    console.log('👤 Test User ID:', testUserId);
    
    // First, check if we can connect to the database
    console.log('\n1️⃣ Testing database connection...');
    const { data: testData, error: testError } = await supabase
      .from('words')
      .select('count')
      .limit(1);

    if (testError) {
      console.error('❌ Database connection error:', testError);
      return;
    }
    console.log('✅ Database connection successful');

    // Check if there are any words in the words table
    console.log('\n2️⃣ Checking words table...');
    const { data: wordsData, error: wordsError } = await supabase
      .from('words')
      .select('id, word, tier')
      .limit(5);

    if (wordsError) {
      console.error('❌ Error fetching words:', wordsError);
      return;
    }

    console.log(`📚 Found ${wordsData?.length || 0} words in database:`);
    wordsData?.forEach(word => console.log(`   - ${word.word} (${word.tier})`));

    // Check if there are any user_progress entries
    console.log('\n3️⃣ Checking user_progress table...');
    const { data: progressData, error: progressError } = await supabase
      .from('user_progress')
      .select('*')
      .limit(5);

    if (progressError) {
      console.error('❌ Error fetching user_progress:', progressError);
      return;
    }

    console.log(`📊 Found ${progressData?.length || 0} user_progress entries:`);
    progressData?.forEach((item, index) => {
      console.log(`${index + 1}. User: ${item.user_id}`);
      console.log(`   - Word ID: ${item.word_id}`);
      console.log(`   - State: ${item.state}`);
      console.log(`   - Next review: ${item.next_review_date}`);
    });

    // Check specifically for our test user
    console.log('\n4️⃣ Checking test user progress...');
    const { data: testUserData, error: testUserError } = await supabase
      .from('user_progress')
      .select('*')
      .eq('user_id', testUserId);

    if (testUserError) {
      console.error('❌ Error fetching test user progress:', testUserError);
      return;
    }

    console.log(`👤 Test user has ${testUserData?.length || 0} progress entries:`);
    testUserData?.forEach((item, index) => {
      console.log(`${index + 1}. Word ID: ${item.word_id}`);
      console.log(`   - State: ${item.state}`);
      console.log(`   - Next review: ${item.next_review_date}`);
      console.log(`   - Study streak: ${item.study_streak}`);
      console.log(`   - Review streak: ${item.review_streak}`);
    });

    // Test the exact query that's failing
    console.log('\n5️⃣ Testing the exact review query...');
    const today = new Date().toISOString().split('T')[0];
    
    const { data: reviewData, error: reviewError } = await supabase
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

    if (reviewError) {
      console.error('❌ Error in review query:', reviewError);
      return;
    }

    console.log(`🔍 Review query returned ${reviewData?.length || 0} words:`);
    reviewData?.forEach((item, index) => {
      console.log(`${index + 1}. ${item.words?.word || 'Unknown'} - Next review: ${item.next_review_date}`);
    });

    console.log('\n📋 Summary:');
    console.log(`- Words in database: ${wordsData?.length || 0}`);
    console.log(`- Total progress entries: ${progressData?.length || 0}`);
    console.log(`- Test user progress entries: ${testUserData?.length || 0}`);
    console.log(`- Words due for review: ${reviewData?.length || 0}`);

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

debugDatabase();
