import * as fs from 'fs-extra';
import * as path from 'path';

export interface WordData {
  word: string;
  difficulty: string;
  tier: string;
}

export class WordParser {
  private wordsFilePath: string;

  constructor(wordsFilePath: string) {
    this.wordsFilePath = wordsFilePath;
  }

  async parseWords(): Promise<WordData[]> {
    try {
      const content = await fs.readFile(this.wordsFilePath, 'utf-8');
      return this.extractWordsFromMarkdown(content);
    } catch (error) {
      console.error('Error reading WORDS.md file:', error);
      throw error;
    }
  }

  private extractWordsFromMarkdown(content: string): WordData[] {
    const words: WordData[] = [];
    
    // Split content into sections by tier
    const sections = content.split('## ');
    
    for (const section of sections) {
      if (section.includes('Top 25 Words') || 
          section.includes('Top 100 Words') || 
          section.includes('Top 200 Words') || 
          section.includes('Top 300 Words') || 
          section.includes('Top 400 Words') || 
          section.includes('Top 500 Words')) {
        
        const tier = this.extractTierFromSection(section);
        const wordsInSection = this.extractWordsFromSection(section, tier);
        words.push(...wordsInSection);
      }
    }
    
    return words;
  }

  private extractTierFromSection(section: string): string {
    if (section.includes('Top 25 Words')) return 'Top 25';
    if (section.includes('Top 100 Words')) return 'Top 100';
    if (section.includes('Top 200 Words')) return 'Top 200';
    if (section.includes('Top 300 Words')) return 'Top 300';
    if (section.includes('Top 400 Words')) return 'Top 400';
    if (section.includes('Top 500 Words')) return 'Top 500';
    return 'Unknown';
  }

  private extractWordsFromSection(section: string, tier: string): WordData[] {
    const words: WordData[] = [];
    
    // Find the markdown table in the section
    const tableMatch = section.match(/\| Word \| Difficulty \| Tier \|[\s\S]*?\|------[\s\S]*?\|([\s\S]*?)(?=\n## |$)/);
    
    if (tableMatch) {
      const tableContent = tableMatch[1];
      const rows = tableContent.split('\n').filter(row => row.trim().startsWith('|'));
      
      for (const row of rows) {
        const columns = row.split('|').map(col => col.trim()).filter(col => col);
        
        if (columns.length >= 3) {
          const word = columns[0];
          const difficulty = columns[1];
          const wordTier = columns[2];
          
          // Only add if it's a valid word (not empty and not a header)
          if (word && word !== 'Word' && word !== '------') {
            words.push({
              word: word.trim(),
              difficulty: difficulty.trim(),
              tier: wordTier.trim()
            });
          }
        }
      }
    }
    
    return words;
  }

  async saveWordsToFile(words: WordData[], outputPath: string): Promise<void> {
    try {
      await fs.ensureDir(path.dirname(outputPath));
      await fs.writeJSON(outputPath, words, { spaces: 2 });
      console.log(`Saved ${words.length} words to ${outputPath}`);
    } catch (error) {
      console.error('Error saving words to file:', error);
      throw error;
    }
  }

  async saveWordsToCSV(words: WordData[], outputPath: string): Promise<void> {
    try {
      await fs.ensureDir(path.dirname(outputPath));
      
      const csvContent = [
        'word,difficulty,tier',
        ...words.map(word => `"${word.word}","${word.difficulty}","${word.tier}"`)
      ].join('\n');
      
      await fs.writeFile(outputPath, csvContent, 'utf-8');
      console.log(`Saved ${words.length} words to CSV: ${outputPath}`);
    } catch (error) {
      console.error('Error saving words to CSV:', error);
      throw error;
    }
  }
}
