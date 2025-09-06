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

async function createTestUser() {
  try {
    console.log('Creating test user with authentication...');

    // First, try to sign up a new user
    const { data, error } = await supabase.auth.signUp({
      email: 'test@example.com',
      password: 'testpassword123',
      options: {
        data: {
          email: 'test@example.com'
        }
      }
    });

    if (error) {
      console.error('Error signing up:', error);
      
      // If user already exists, try to sign in
      if (error.message.includes('already registered')) {
        console.log('User already exists, trying to sign in...');
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email: 'test@example.com',
          password: 'testpassword123'
        });

        if (signInError) {
          console.error('Error signing in:', signInError);
          return;
        }

        console.log('Successfully signed in:', signInData.user?.email);
        return signInData.user;
      }
      return;
    }

    console.log('Successfully created user:', data.user?.email);
    return data.user;

  } catch (error) {
    console.error('Error creating test user:', error);
  }
}

createTestUser();
