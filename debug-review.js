const { createClient } = require('@supabase/supabase-js');

// Load environment variables directly
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://your-project.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'your-service-key';

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
  console.log('Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function debugReviewWords() {
  try {
    console.log('Debugging review words...');

    // Get the test user
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

    // Check all user progress
    const { data: allProgress, error: allError } = await supabase
      .from('user_progress')
      .select('*')
      .eq('user_id', userId);

    if (allError) {
      console.error('Error fetching all progress:', allError);
      return;
    }

    console.log('All user progress:', allProgress);

    // Check words in ready state
    const { data: readyWords, error: readyError } = await supabase
      .from('user_progress')
      .select('*')
      .eq('user_id', userId)
      .eq('state', 'ready');

    if (readyError) {
      console.error('Error fetching ready words:', readyError);
      return;
    }

    console.log('Words in ready state:', readyWords);

    // Check today's date
    const today = new Date().toISOString().split('T')[0];
    console.log('Today\'s date:', today);

    // Check words due for review
    const { data: dueWords, error: dueError } = await supabase
      .from('user_progress')
      .select('*')
      .eq('user_id', userId)
      .eq('state', 'ready')
      .lte('next_review_date', today);

    if (dueError) {
      console.error('Error fetching due words:', dueError);
      return;
    }

    console.log('Words due for review:', dueWords);

    // Test the full query with joins
    const { data: fullQuery, error: fullError } = await supabase
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
      .eq('user_id', userId)
      .eq('state', 'ready')
      .lte('next_review_date', today)
      .order('next_review_date', { ascending: true });

    if (fullError) {
      console.error('Error with full query:', fullError);
      return;
    }

    console.log('Full query result:', fullQuery);

  } catch (error) {
    console.error('Error debugging review words:', error);
  }
}

debugReviewWords();
