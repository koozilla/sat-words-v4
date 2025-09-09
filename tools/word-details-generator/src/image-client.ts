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
    api_key = os.getenv('GEMINI_API_KEY')
    if not api_key:
        raise Exception('GEMINI_API_KEY not found')
    
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
                    # Convert to RGB and save as PNG for better mobile compatibility
                    if image.mode != 'RGB':
                        image = image.convert('RGB')
                    image.save('${outputPath.replace(/\\/g, '/')}', 'PNG')
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
    // Create a simple PNG placeholder using a base64 encoded PNG
    // This is a 1x1 transparent PNG that we'll use as a placeholder
    const base64PNG = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
    return Buffer.from(base64PNG, 'base64');
  }

  private truncatePrompt(prompt: string, maxLength: number): string {
    if (prompt.length <= maxLength) return prompt;
    return prompt.substring(0, maxLength - 3) + '...';
  }
}
