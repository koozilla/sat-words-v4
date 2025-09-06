import { GeminiClient, WordDetails } from './gemini-client';
import { WordParser, WordData } from './word-parser';
import * as fs from 'fs-extra';
import * as path from 'path';

export class ContentGenerator {
  private geminiClient: GeminiClient;
  private wordParser: WordParser;
  private outputDir: string;
  private batchSize: number;
  private delayBetweenRequests: number;
  private maxRetries: number;

  constructor(
    wordsFilePath: string,
    outputDir: string,
    batchSize: number = 10,
    delayBetweenRequests: number = 1000,
    maxRetries: number = 3
  ) {
    this.geminiClient = new GeminiClient();
    this.wordParser = new WordParser(wordsFilePath);
    this.outputDir = outputDir;
    this.batchSize = batchSize;
    this.delayBetweenRequests = delayBetweenRequests;
    this.maxRetries = maxRetries;
  }

  async generateAllWordDetails(): Promise<WordDetails[]> {
    console.log('Starting word details generation...');
    
    // Parse words from WORDS.md
    const words = await this.wordParser.parseWords();
    console.log(`Found ${words.length} words to process`);
    
    // Save parsed words for reference
    await this.wordParser.saveWordsToFile(words, path.join(this.outputDir, 'parsed-words.json'));
    await this.wordParser.saveWordsToCSV(words, path.join(this.outputDir, 'parsed-words.csv'));
    
    // Generate details for all words
    const wordDetails: WordDetails[] = [];
    const totalWords = words.length;
    
    for (let i = 0; i < totalWords; i += this.batchSize) {
      const batch = words.slice(i, i + this.batchSize);
      console.log(`Processing batch ${Math.floor(i / this.batchSize) + 1}/${Math.ceil(totalWords / this.batchSize)}`);
      
      const batchDetails = await this.processBatch(batch);
      wordDetails.push(...batchDetails);
      
      // Save progress
      await this.saveProgress(wordDetails, i + batch.length, totalWords);
      
      // Delay between batches to avoid rate limiting
      if (i + this.batchSize < totalWords) {
        console.log(`Waiting ${this.delayBetweenRequests}ms before next batch...`);
        await this.delay(this.delayBetweenRequests);
      }
    }
    
    // Save final results
    await this.saveFinalResults(wordDetails);
    
    console.log(`Successfully generated details for ${wordDetails.length} words`);
    return wordDetails;
  }

  private async processBatch(words: WordData[]): Promise<WordDetails[]> {
    const batchDetails: WordDetails[] = [];
    
    for (const word of words) {
      let attempts = 0;
      let success = false;
      
      while (attempts < this.maxRetries && !success) {
        try {
          console.log(`Generating details for: ${word.word} (${word.difficulty}, ${word.tier})`);
          const details = await this.geminiClient.generateWordDetails(word.word, word.difficulty, word.tier);
          batchDetails.push(details);
          success = true;
        } catch (error) {
          attempts++;
          console.error(`Attempt ${attempts} failed for word "${word.word}":`, error);
          
          if (attempts < this.maxRetries) {
            console.log(`Retrying in ${this.delayBetweenRequests}ms...`);
            await this.delay(this.delayBetweenRequests);
          } else {
            console.error(`Failed to generate details for word "${word.word}" after ${this.maxRetries} attempts`);
            // Add fallback data
            batchDetails.push({
              word: word.word,
              definition: `Definition for ${word.word}`,
              partOfSpeech: 'unknown',
              synonyms: [],
              antonyms: [],
              examples: [],
              difficulty: word.difficulty as 'Easy' | 'Medium' | 'Hard',
              tier: word.tier
            });
          }
        }
      }
    }
    
    return batchDetails;
  }

  private async saveProgress(wordDetails: WordDetails[], processed: number, total: number): Promise<void> {
    try {
      await fs.ensureDir(this.outputDir);
      
      // Save current progress
      await fs.writeJSON(
        path.join(this.outputDir, 'progress.json'),
        {
          processed,
          total,
          percentage: Math.round((processed / total) * 100),
          timestamp: new Date().toISOString(),
          wordDetails
        },
        { spaces: 2 }
      );
      
      console.log(`Progress: ${processed}/${total} (${Math.round((processed / total) * 100)}%)`);
    } catch (error) {
      console.error('Error saving progress:', error);
    }
  }

  private async saveFinalResults(wordDetails: WordDetails[]): Promise<void> {
    try {
      await fs.ensureDir(this.outputDir);
      
      // Save complete results as JSON
      await fs.writeJSON(
        path.join(this.outputDir, 'word-details.json'),
        wordDetails,
        { spaces: 2 }
      );
      
      // Save as CSV
      const csvContent = [
        'word,definition,partOfSpeech,synonyms,antonyms,examples,difficulty,tier',
        ...wordDetails.map(word => [
          `"${word.word}"`,
          `"${word.definition.replace(/"/g, '""')}"`,
          `"${word.partOfSpeech}"`,
          `"${word.synonyms.join('; ')}"`,
          `"${word.antonyms.join('; ')}"`,
          `"${word.examples.join('; ')}"`,
          `"${word.difficulty}"`,
          `"${word.tier}"`
        ].join(','))
      ].join('\n');
      
      await fs.writeFile(
        path.join(this.outputDir, 'word-details.csv'),
        csvContent,
        'utf-8'
      );
      
      // Save by tier
      const tiers = [...new Set(wordDetails.map(word => word.tier))];
      for (const tier of tiers) {
        const tierWords = wordDetails.filter(word => word.tier === tier);
        await fs.writeJSON(
          path.join(this.outputDir, `${tier.toLowerCase().replace(/\s+/g, '-')}.json`),
          tierWords,
          { spaces: 2 }
        );
      }
      
      console.log(`Final results saved to ${this.outputDir}`);
    } catch (error) {
      console.error('Error saving final results:', error);
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
