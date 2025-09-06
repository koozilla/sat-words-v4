// Script to check current word states
const { createClient } = require('@supabase/supabase-js');

// You need to replace these with your actual Supabase credentials
const supabaseUrl = 'https://your-project.supabase.co'; // Your actual Supabase URL
const supabaseKey = 'your-service-role-key'; // Your actual service role key

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkCurrentWordStates() {
  try {
    const testUserId = '11111111-1111-1111-1111-111111111111';
    
    console.log('🔍 Checking current word states...');
    console.log('📅 Today:', new Date().toISOString().split('T')[0]);
    
    // Check all user progress for this user
    const { data: allProgress, error: allError } = await supabase
      .from('user_progress')
      .select(`
        id,
        state,
        next_review_date,
        review_interval,
        study_streak,
        review_streak,
        last_studied,
        words:word_id (
          word,
          tier
        )
      `)
      .eq('user_id', testUserId);

    if (allError) {
      console.error('Error fetching progress:', allError);
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

      console.log('\n📋 Detailed word list:');
      allProgress.forEach((item, index) => {
        const isDue = item.next_review_date && item.next_review_date <= new Date().toISOString().split('T')[0];
        console.log(`${index + 1}. ${item.words.word} (${item.words.tier})`);
        console.log(`   - State: ${item.state}`);
        console.log(`   - Study streak: ${item.study_streak}`);
        console.log(`   - Review streak: ${item.review_streak}`);
        console.log(`   - Last studied: ${item.last_studied}`);
        console.log(`   - Next review: ${item.next_review_date || 'N/A'}`);
        console.log(`   - Review interval: ${item.review_interval || 'N/A'} days`);
        console.log(`   - Is due: ${isDue ? '✅ YES' : '❌ NO'}`);
        console.log('');
      });
    } else {
      console.log('❌ No progress entries found');
      console.log('💡 You need to create test data first');
    }

  } catch (error) {
    console.error('Error:', error);
  }
}

checkCurrentWordStates();
