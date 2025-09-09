
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
    
    prompt = """
Create a memorable, educational cartoon-style image for the SAT vocabulary word \"Anomaly\".

Word Definition: \"Something that deviates from what is standard, normal, or expected; an irregularity or an inconsistency.\"
Part of Speech: noun
Example Sentence: \"The research team observed an anomaly in the experimental results, as one data point significantly differed from the expected pattern.\"
Synonyms: deviation, abnormality, irregularity, outlier, exception
Difficulty: Medium | Tier: top_25

Image Requirements:
- Cartoon/animated style (k-pop style animation - vibrant, energetic, colorful)
- Create a scene that illustrates the EXAMPLE SENTENCE
- Show the word in action through the example context
- Clear visual connection to the word's meaning
- Memorable and distinctive characters/setting
- Appropriate for high school students
- Educational value for vocabulary learning
- High contrast and clear details
- 16:9 aspect ratio, high resolution
- DO NOT include the actual word \"Anomaly\" anywhere in the image

Visual Style Guidelines:
- Use bright, vibrant colors with strong contrast
- Create engaging characters that students can relate to
- Include symbolic elements that reinforce meaning
- Avoid text in the image (especially the word itself)
- Make it instantly recognizable and memorable
- Use visual storytelling through the example sentence
- Focus on the ACTION or SITUATION described in the example
- K-pop style animation: vibrant, energetic, colorful, dynamic

Scene Creation Instructions:
1. Read the example sentence carefully
2. Create a cartoon scene that shows the example situation
3. Make the characters expressive and relatable
4. Use visual metaphors that help remember the word
5. Ensure the scene clearly demonstrates the word's meaning
6. IMPORTANT: Do not include the word \"Anomaly\" in the image

Generate an image that tells the story of the example sentence: \"The research team observed an anomaly in the experimental results, as one data point significantly differed from the expected pattern.\"
This will help students remember \"Anomaly\" means \"Something that deviates from what is standard, normal, or expected; an irregularity or an inconsistency.\".
"""
    
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
                    image.save('/Users/saekoo/sat-words-v4/tools/word-details-generator/output/temp_generated_image.png', 'PNG')
                    print(f"SUCCESS: Image saved to /Users/saekoo/sat-words-v4/tools/word-details-generator/output/temp_generated_image.png")
                    return
    
    raise Exception('No image data found')

if __name__ == "__main__":
    generate_image()
      