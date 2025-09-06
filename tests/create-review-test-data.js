const { createClient } = require('@supabase/supabase-js');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createReviewTestData() {
  try {
    console.log('Creating review test data...');

    // First, get the test user
    const { data: users, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('email', 'test@example.com')
      .limit(1);

    if (userError) {
      console.error('Error fetching user:', userError);
      return;
    }

    if (!users || users.length === 0) {
      console.error('Test user not found');
      return;
    }

    const userId = users[0].id;
    console.log('Found test user:', userId);

    // Get some words from the database
    const { data: words, error: wordsError } = await supabase
      .from('words')
      .select('id, word')
      .eq('tier', 'Top 25')
      .limit(3);

    if (wordsError) {
      console.error('Error fetching words:', wordsError);
      return;
    }

    if (!words || words.length === 0) {
      console.error('No words found');
      return;
    }

    console.log('Found words:', words.map(w => w.word));

    // Add these words to the user's progress in 'ready' state for review
    const reviewWords = words.map(word => ({
      user_id: userId,
      word_id: word.id,
      state: 'ready',
      times_studied: 2,
      times_reviewed: 1,
      correct_count: 1,
      incorrect_count: 1,
      last_studied_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago
      next_review_date: new Date().toISOString(), // Due for review now
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }));

    const { error: insertError } = await supabase
      .from('user_progress')
      .upsert(reviewWords, { 
        onConflict: 'user_id,word_id',
        ignoreDuplicates: false 
      });

    if (insertError) {
      console.error('Error inserting review words:', insertError);
      return;
    }

    console.log('✅ Successfully added', reviewWords.length, 'words to review state');
    console.log('Words added:', words.map(w => w.word));

    // Verify the data was inserted
    const { data: progress, error: progressError } = await supabase
      .from('user_progress')
      .select(`
        state,
        words:word_id (
          word
        )
      `)
      .eq('user_id', userId)
      .eq('state', 'ready');

    if (progressError) {
      console.error('Error verifying data:', progressError);
      return;
    }

    console.log('✅ Verification successful!');
    console.log('Words in ready state:', progress.map(p => p.words.word));

  } catch (error) {
    console.error('Error creating review test data:', error);
  }
}

createReviewTestData();
