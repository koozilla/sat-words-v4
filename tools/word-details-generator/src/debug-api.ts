import { GoogleGenerativeAI } from '@google/generative-ai';
import * as dotenv from 'dotenv';

dotenv.config();

async function debugAPI() {
  console.log('🔍 Debugging Gemini API for text generation...');
  
  // Check API key
  const apiKey = process.env.GEMINI_API_KEY;
  console.log('API Key present:', !!apiKey);
  console.log('API Key length:', apiKey ? apiKey.length : 0);
  console.log('API Key starts with:', apiKey ? apiKey.substring(0, 10) + '...' : 'N/A');
  
  if (!apiKey) {
    console.error('❌ No API key found');
    return;
  }
  
  try {
    // Initialize client
    const client = new GoogleGenerativeAI(apiKey);
    console.log('✅ Client initialized successfully');
    
    // Test text generation model
    console.log('\n📝 Testing Gemini 2.5 Flash for text generation...');
    try {
      const model = client.getGenerativeModel({ 
        model: 'gemini-2.5-flash' 
      });
      
      const prompt = 'Generate a short educational description for the SAT word "benevolent"';
      console.log('📡 Sending test request...');
      const response = await model.generateContent([prompt]);
      
      console.log('✅ Model response received');
      console.log('Response text:', response.response.text());
      
    } catch (error) {
      console.error('❌ Error with Gemini 2.5 Flash:', error);
    }
    
  } catch (error) {
    console.error('❌ Client initialization failed:', error);
  }
}

if (require.main === module) {
  debugAPI();
}
