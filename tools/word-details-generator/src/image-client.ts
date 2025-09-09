import { spawn } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';

export class ImageClient {
  constructor() {
    console.log('✅ ImageClient initialized with Gemini 2.5 Flash (via Python)');
  }

  async generateImage(prompt: string): Promise<Buffer> {
    console.log('🎨 Generating image with Gemini 2.5 Flash (via Python)...');
    console.log('Prompt:', prompt);
    
    try {
      // Create a temporary Python script with the specific prompt
      const tempScriptPath = path.join(__dirname, '..', 'temp_image_generation.py');
      const outputPath = path.join(__dirname, '..', 'output', 'temp_generated_image.png');
      
      const pythonScript = `
import os
import google.generativeai as genai
from PIL import Image
from io import BytesIO
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

def generate_image():
    api_key = os.getenv('API_KEY')
    if not api_key:
        raise Exception('API_KEY not found')
    
    genai.configure(api_key=api_key)
    model = genai.GenerativeModel('gemini-2.5-flash-image-preview')
    
    prompt = """${prompt.replace(/"/g, '\\"')}"""
    
    response = model.generate_content(prompt)
    
    if response.candidates and len(response.candidates) > 0:
        candidate = response.candidates[0]
        for i, part in enumerate(candidate.content.parts):
            if hasattr(part, 'inline_data') and part.inline_data is not None:
                image_data = part.inline_data.data
                if len(image_data) > 0:  # Skip empty parts
                    image_bytes = image_data if isinstance(image_data, bytes) else image_data.encode()
                    image = Image.open(BytesIO(image_bytes))
                    image.save('${outputPath.replace(/\\/g, '/')}')
                    print(f"SUCCESS: Image saved to ${outputPath}")
                    return
    
    raise Exception('No image data found')

if __name__ == "__main__":
    generate_image()
      `;
      
      // Write the temporary Python script
      fs.writeFileSync(tempScriptPath, pythonScript);
      
      // Execute the Python script
      return new Promise((resolve, reject) => {
        const pythonProcess = spawn('python3', [tempScriptPath]);
        
        let stdout = '';
        let stderr = '';
        
        pythonProcess.stdout.on('data', (data) => {
          stdout += data.toString();
        });
        
        pythonProcess.stderr.on('data', (data) => {
          stderr += data.toString();
        });
        
        pythonProcess.on('close', (code) => {
          // Clean up temporary script
          try {
            fs.unlinkSync(tempScriptPath);
          } catch (e) {
            // Ignore cleanup errors
          }
          
          if (code === 0) {
            console.log('✅ Python script executed successfully');
            console.log('Output:', stdout);
            
            // Read the generated image
            if (fs.existsSync(outputPath)) {
              const imageBuffer = fs.readFileSync(outputPath);
              console.log(`📊 Image buffer size: ${imageBuffer.length} bytes`);
              
              // Clean up output file
              try {
                fs.unlinkSync(outputPath);
              } catch (e) {
                // Ignore cleanup errors
              }
              
              resolve(imageBuffer);
            } else {
              reject(new Error('Image file not found after Python execution'));
            }
          } else {
            console.error('❌ Python script failed');
            console.error('Error:', stderr);
            reject(new Error(`Python script failed with code ${code}: ${stderr}`));
          }
        });
      });
      
    } catch (error) {
      console.error('❌ Error generating image:', error);
      console.log('🔄 Creating placeholder image...');
      return this.createPlaceholderImage(prompt);
    }
  }

  private createPlaceholderImage(prompt: string): Buffer {
    const svgContent = `
      <svg width="1024" height="576" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:#4285F4;stop-opacity:1" />
            <stop offset="50%" style="stop-color:#34A853;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#FBBC04;stop-opacity:1" />
          </linearGradient>
        </defs>
        <rect width="1024" height="576" fill="url(#grad1)"/>
        
        <text x="512" y="150" font-family="Arial, sans-serif" font-size="36" font-weight="bold" text-anchor="middle" fill="white">Gemini 2.5 Flash</text>
        <text x="512" y="220" font-family="Arial, sans-serif" font-size="28" font-weight="bold" text-anchor="middle" fill="white">SAT Vocabulary Image</text>
        <text x="512" y="280" font-family="Arial, sans-serif" font-size="16" text-anchor="middle" fill="white" opacity="0.9">
          ${this.truncatePrompt(prompt, 100)}
        </text>
        <text x="512" y="340" font-family="Arial, sans-serif" font-size="20" text-anchor="middle" fill="white">Generated via Python</text>
      </svg>
    `;
    return Buffer.from(svgContent, 'utf-8');
  }

  private truncatePrompt(prompt: string, maxLength: number): string {
    if (prompt.length <= maxLength) return prompt;
    return prompt.substring(0, maxLength - 3) + '...';
  }
}
