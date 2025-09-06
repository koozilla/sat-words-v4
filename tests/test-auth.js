const { createClient } = require('@supabase/supabase-js');

// Load environment variables directly
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://your-project.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'your-anon-key';

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables');
  console.log('Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testAuth() {
  try {
    console.log('Testing authentication...');

    // Try to sign in with the test user
    const { data, error } = await supabase.auth.signInWithPassword({
      email: 'test@example.com',
      password: 'testpassword123'
    });

    if (error) {
      console.error('Error signing in:', error);
      return;
    }

    console.log('Successfully signed in:', data.user?.email);

    // Test the query with the authenticated user
    const { data: reviewWords, error: queryError } = await supabase
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
      .eq('user_id', data.user.id)
      .eq('state', 'ready')
      .lte('next_review_date', new Date().toISOString().split('T')[0])
      .order('next_review_date', { ascending: true });

    if (queryError) {
      console.error('Error with authenticated query:', queryError);
      return;
    }

    console.log('Authenticated query result:', reviewWords);

  } catch (error) {
    console.error('Error testing auth:', error);
  }
}

testAuth();
