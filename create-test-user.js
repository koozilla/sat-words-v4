const { createClient } = require('@supabase/supabase-js');

// Use service role key to bypass RLS
const supabaseUrl = 'https://zamsflxcqafnhqrgedea.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InphbXNmbHhjcWFmbmhxcmdlZGVhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjYxNzI0MSwiZXhwIjoyMDcyMTkzMjQxfQ.EoMK0cixwQNchL7X2LzOYpP6A1OhsDdgath4Ph5uFpE';

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function createTestUserAndAddWords() {
  console.log('👤 Creating test user and adding words to active pool...');
  
  try {
    // First, create a test user
    const testUserId = '11111111-1111-1111-1111-111111111111';
    const testEmail = 'test@example.com';
    
    const { data: user, error: userError } = await supabase
      .from('users')
      .upsert({
        id: testUserId,
        email: testEmail,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        study_streak: 0,
        total_points: 0,
        current_tier: 'top_25',
        last_study_date: null
      })
      .select('id')
      .single();
    
    if (userError) {
      console.log('❌ Error creating user:', userError.message);
      return;
    }
    
    console.log('✅ Test user created:', user.id);
    
    // Get first 5 words from Top 25 tier
    const { data: words, error: wordsError } = await supabase
      .from('words')
      .select('id, word')
      .eq('tier', 'Top 25')
      .limit(5);
    
    if (wordsError) {
      console.log('❌ Error fetching words:', wordsError.message);
      return;
    }
    
    console.log('📝 Found words to add:', words.map(w => w.word).join(', '));
    
    // Add words to active pool (started state)
    const progressEntries = words.map(word => ({
      user_id: user.id,
      word_id: word.id,
      state: 'started',
      study_streak: 0,
      review_streak: 0,
      last_studied: new Date().toISOString()
    }));
    
    const { data: inserted, error: insertError } = await supabase
      .from('user_progress')
      .insert(progressEntries)
      .select('word_id');
    
    if (insertError) {
      console.log('❌ Error inserting progress:', insertError.message);
      return;
    }
    
    console.log('✅ Successfully added', inserted.length, 'words to active pool');
    console.log('🎉 You can now test the study session!');
    console.log('📧 Test user email:', testEmail);
    console.log('🆔 Test user ID:', user.id);
    
    // Verify the insertion
    const { count: activeCount } = await supabase
      .from('user_progress')
      .select('*', { count: 'exact', head: true })
      .eq('state', 'started');
    
    console.log('📊 Total words in active pool:', activeCount);
    
  } catch (error) {
    console.log('❌ Error:', error.message);
  }
}

createTestUserAndAddWords();
