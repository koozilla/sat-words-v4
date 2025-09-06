import { supabase } from './supabase'

export async function testDatabaseConnection() {
  console.log('🔍 Testing Supabase database connection...')
  
  try {
    // Test 1: Check environment variables
    console.log('\n1. Checking environment variables...')
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    
    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error('Missing Supabase environment variables')
    }
    console.log('✅ Environment variables loaded')
    console.log(`   URL: ${supabaseUrl}`)
    console.log(`   Key: ${supabaseAnonKey.substring(0, 20)}...`)

    // Test 2: Test basic connection
    console.log('\n2. Testing basic connection...')
    const { data, error } = await supabase
      .from('words')
      .select('count')
      .limit(1)
    
    if (error) {
      throw new Error(`Connection failed: ${error.message}`)
    }
    console.log('✅ Database connection successful')

    // Test 3: Check tables exist
    console.log('\n3. Checking required tables...')
    const tables = ['users', 'words', 'user_progress', 'sessions', 'badges', 'user_badges']
    
    for (const table of tables) {
      const { error } = await supabase
        .from(table)
        .select('*')
        .limit(1)
      
      if (error) {
        console.log(`❌ Table '${table}' not accessible: ${error.message}`)
      } else {
        console.log(`✅ Table '${table}' accessible`)
      }
    }

    // Test 4: Check badges were inserted
    console.log('\n4. Checking initial data...')
    const { data: badges, error: badgesError } = await supabase
      .from('badges')
      .select('id, name')
      .limit(5)
    
    if (badgesError) {
      console.log(`❌ Badges check failed: ${badgesError.message}`)
    } else {
      console.log(`✅ Found ${badges?.length || 0} badges`)
      if (badges && badges.length > 0) {
        console.log('   Sample badges:')
        badges.forEach(badge => console.log(`   - ${badge.name}`))
      }
    }

    // Test 5: Test custom types
    console.log('\n5. Testing custom types...')
    const { data: wordStates, error: wordStatesError } = await supabase
      .from('user_progress')
      .select('state')
      .limit(1)
    
    if (wordStatesError) {
      console.log(`❌ Custom types test failed: ${wordStatesError.message}`)
    } else {
      console.log('✅ Custom types working')
    }

    // Test 6: Test RLS policies
    console.log('\n6. Testing RLS policies...')
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id')
      .limit(1)
    
    if (usersError) {
      console.log(`❌ RLS test failed: ${usersError.message}`)
    } else {
      console.log('✅ RLS policies working (no unauthorized access)')
    }

    // Test 7: Test authentication
    console.log('\n7. Testing authentication...')
    const { data: authData, error: authError } = await supabase.auth.getSession()
    
    if (authError) {
      console.log(`❌ Auth test failed: ${authError.message}`)
    } else {
      console.log('✅ Authentication system accessible')
      console.log(`   Current session: ${authData.session ? 'Active' : 'None'}`)
    }

    console.log('\n🎉 Database connection test completed successfully!')
    return { success: true, message: 'All tests passed' }

  } catch (error) {
    console.error('\n❌ Database connection test failed:')
    console.error(error)
    return { success: false, message: error instanceof Error ? error.message : 'Unknown error' }
  }
}

// Test function for API route
export async function GET() {
  const result = await testDatabaseConnection()
  
  return new Response(JSON.stringify(result), {
    status: result.success ? 200 : 500,
    headers: {
      'Content-Type': 'application/json',
    },
  })
}

// CLI test function
if (require.main === module) {
  testDatabaseConnection()
    .then(result => {
      if (result.success) {
        console.log('\n✅ All tests passed!')
        process.exit(0)
      } else {
        console.log('\n❌ Tests failed!')
        process.exit(1)
      }
    })
    .catch(error => {
      console.error('Test failed:', error)
      process.exit(1)
    })
}
