# Word Details Generator

A tool to generate comprehensive word details for SAT vocabulary using Gemini AI and optionally insert them into a Supabase database.

## Overview

This tool processes the WORDS.md file and generates detailed information for each word including:
- Definitions
- Part of speech
- Synonyms
- Antonyms
- Example sentences
- Difficulty-based content complexity

The tool can also insert the generated word details directly into your Supabase database.

## Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure environment:**
   ```bash
   cp env.example .env
   ```
   
   Edit `.env` and add your configuration:
   ```
   # Required
   GEMINI_API_KEY=your_gemini_api_key_here
   
   # Optional - for database insertion
   SUPABASE_URL=your_supabase_url_here
   SUPABASE_ANON_KEY=your_supabase_anon_key_here
   SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key_here
   INSERT_TO_DATABASE=true
   CLEAR_EXISTING_WORDS=false
   ```

3. **Build the project:**
   ```bash
   npm run build
   ```

## Usage

### Generate all word details (with database insertion):
```bash
npm run generate
```

### Development mode:
```bash
npm run dev
```

## Configuration

Edit the `.env` file to customize:

### Required Settings
- `GEMINI_API_KEY`: Your Gemini AI API key (required)

### Database Settings (Optional)
- `SUPABASE_URL`: Your Supabase project URL
- `SUPABASE_ANON_KEY`: Your Supabase anonymous key (for RLS-compliant operations)
- `SUPABASE_SERVICE_ROLE_KEY`: Your Supabase service role key (bypasses RLS - recommended for bulk operations)
- `INSERT_TO_DATABASE`: Whether to insert words into database (true/false)
- `CLEAR_EXISTING_WORDS`: Whether to clear existing words before insertion (true/false)

**Note**: The tool will use the service role key if available (recommended for bulk operations), otherwise it will fall back to the anon key.

### Processing Settings
- `WORDS_FILE_PATH`: Path to WORDS.md file (default: ../../WORDS.md)
- `OUTPUT_DIR`: Output directory for results (default: ./output)
- `BATCH_SIZE`: Number of words to process in each batch (default: 10)
- `DELAY_BETWEEN_REQUESTS`: Delay between API requests in ms (default: 1000)
- `MAX_RETRIES`: Maximum retry attempts for failed requests (default: 3)

## Database Integration

The tool can automatically insert generated word details into your Supabase database:

1. **Enable database insertion** by setting `INSERT_TO_DATABASE=true`
2. **Provide Supabase credentials** (URL and service role key)
3. **Optionally clear existing words** by setting `CLEAR_EXISTING_WORDS=true`

The tool will:
- Test database connection before starting
- Insert words in batches for efficiency
- Continue processing even if database insertion fails
- Provide a summary of total words in database

## Output Files

The tool generates several output files:

- `word-details.json`: Complete results in JSON format
- `word-details.csv`: Results in CSV format
- `progress.json`: Progress tracking and current status
- `parsed-words.json`: Original word list from WORDS.md
- `parsed-words.csv`: Original word list in CSV format
- `[tier].json`: Words grouped by tier (e.g., top-25.json, top-100.json)

## Features

- **Batch Processing**: Processes words in configurable batches
- **Database Integration**: Optional Supabase database insertion
- **Progress Tracking**: Saves progress and allows resuming
- **Error Handling**: Retries failed requests with exponential backoff
- **Rate Limiting**: Configurable delays between API requests
- **Multiple Formats**: Outputs JSON and CSV formats
- **Tier Organization**: Groups results by SAT word tiers

## Error Handling

The tool includes comprehensive error handling:
- Retries failed API requests up to 3 times
- Saves progress after each batch
- Continues processing even if individual words fail
- Provides fallback data for failed words
- Gracefully handles database connection issues

## Requirements

- Node.js 18+
- Gemini AI API key
- WORDS.md file with SAT vocabulary
- Supabase project (for database insertion)

## Troubleshooting

1. **API Key Issues**: Ensure your Gemini API key is valid and has sufficient quota
2. **Database Issues**: Check Supabase credentials and ensure database schema is set up
3. **File Path Issues**: Check that WORDS.md file exists at the specified path
4. **Rate Limiting**: Increase `DELAY_BETWEEN_REQUESTS` if you hit rate limits
5. **Memory Issues**: Reduce `BATCH_SIZE` for large word lists

## Example Output

```json
{
  "word": "magnanimous",
  "definition": "Generous in forgiving; noble in spirit",
  "partOfSpeech": "adjective",
  "synonyms": ["generous", "noble", "forgiving", "charitable", "benevolent"],
  "antonyms": ["petty", "spiteful", "vindictive"],
  "examples": [
    "He was magnanimous in victory, congratulating his opponent graciously.",
    "Her magnanimous gesture of forgiveness touched everyone's heart."
  ],
  "difficulty": "Hard",
  "tier": "Top 300"
}
```
