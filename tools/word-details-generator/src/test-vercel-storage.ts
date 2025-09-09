import { ImageStorage } from './image-storage';
import * as path from 'path';

async function testVercelStorage() {
  try {
    console.log('🚀 Testing Vercel Blob Storage integration...');
    
    // Check if Vercel token is available
    const hasToken = !!process.env.BLOB_READ_WRITE_TOKEN;
    console.log(`🔑 Vercel Blob token available: ${hasToken ? '✅ Yes' : '❌ No'}`);
    
    if (!hasToken) {
      console.log('📝 To test Vercel storage, add BLOB_READ_WRITE_TOKEN to your .env file');
      console.log('   Get your token from: https://vercel.com/dashboard/stores');
      console.log('');
      console.log('🔄 Testing local storage fallback instead...');
    }
    
    // Set up output directory
    const outputDir = path.join(__dirname, '../output');
    
    // Create image storage client
    const storage = new ImageStorage(outputDir);
    
    // Create a test SVG image
    const testSvg = `
      <svg width="400" height="300" xmlns="http://www.w3.org/2000/svg">
        <rect width="400" height="300" fill="#4F46E5"/>
        <text x="200" y="150" font-family="Arial" font-size="24" text-anchor="middle" fill="white">
          Vercel Storage Test
        </text>
        <text x="200" y="180" font-family="Arial" font-size="16" text-anchor="middle" fill="white">
          ${hasToken ? 'Uploading to Vercel Blob' : 'Local storage fallback'}
        </text>
      </svg>
    `;
    
    const imageBuffer = Buffer.from(testSvg, 'utf-8');
    
    // Upload the test image
    console.log('📤 Uploading test image...');
    const imageUrl = await storage.uploadImage(imageBuffer, 'vercel-test');
    
    console.log('');
    console.log('📊 Results:');
    console.log('='.repeat(50));
    console.log(`Image URL: ${imageUrl}`);
    console.log(`Storage Type: ${imageUrl.startsWith('http') ? '☁️ Vercel Blob' : '💾 Local File'}`);
    console.log('');
    
    if (imageUrl.startsWith('http')) {
      console.log('✅ Successfully uploaded to Vercel Blob storage!');
      console.log('🌐 You can view the image at:', imageUrl);
    } else {
      console.log('💾 Image saved locally (Vercel token not configured)');
    }
    
    console.log('');
    console.log('✅ Vercel storage test completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

// Run the test
if (require.main === module) {
  testVercelStorage();
}
