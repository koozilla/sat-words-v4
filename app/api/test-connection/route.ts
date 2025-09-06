import { testDatabaseConnection } from '@/lib/test-connection'

export async function GET() {
  const result = await testDatabaseConnection()
  
  return new Response(JSON.stringify(result), {
    status: result.success ? 200 : 500,
    headers: {
      'Content-Type': 'application/json',
    },
  })
}
