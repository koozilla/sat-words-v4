import { GoogleGenerativeAI } from '@google/generative-ai';
import * as dotenv from 'dotenv';

dotenv.config();

async function listAvailableModels() {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error('API_KEY is required');
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  
  try {
    console.log('🔍 Testing different model names...');
    
    const modelNames = [
      'gemini-2.5-flash',
      'gemini-2.5-flash-image',
      'gemini-2.5-flash-image-preview',
      'gemini-2.0-flash-exp',
      'gemini-1.5-flash',
      'gemini-1.5-pro',
      'gemini-pro'
    ];
    
    console.log('\n📋 Testing Models:');
    console.log('==================');
    
    for (const modelName of modelNames) {
      try {
        console.log(`\n🧪 Testing: ${modelName}`);
        const model = genAI.getGenerativeModel({ model: modelName });
        
        // Try a simple text generation to see if the model works
        const result = await model.generateContent('Hello');
        const response = await result.response;
        const text = response.text();
        
        console.log(`✅ ${modelName} - WORKS`);
        console.log(`   Response: ${text.substring(0, 50)}...`);
        
      } catch (error: any) {
        console.log(`❌ ${modelName} - FAILED`);
        console.log(`   Error: ${error.message}`);
      }
    }
    
  } catch (error) {
    console.error('❌ Error testing models:', error);
  }
}

listAvailableModels().catch(console.error);
