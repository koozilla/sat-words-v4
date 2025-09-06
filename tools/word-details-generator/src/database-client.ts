import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

export interface DatabaseWord {
  word: string;
  definition: string;
  part_of_speech: string;
  example_sentence: string;
  synonyms: string[];
  antonyms: string[];
  tier: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  image_urls?: string[];
  image_descriptions?: string[];
}

export class DatabaseClient {
  private supabase;

  constructor() {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

    if (!supabaseUrl) {
      throw new Error('Missing SUPABASE_URL environment variable.');
    }

    if (!supabaseServiceKey && !supabaseAnonKey) {
      throw new Error('Missing Supabase keys. Please set either SUPABASE_SERVICE_ROLE_KEY or SUPABASE_ANON_KEY environment variable.');
    }

    // Use service role key if available (bypasses RLS), otherwise use anon key
    const keyToUse = supabaseServiceKey || supabaseAnonKey;
    this.supabase = createClient(supabaseUrl, keyToUse!);
  }

  async testConnection(): Promise<boolean> {
    try {
      const { data, error } = await this.supabase
        .from('words')
        .select('count')
        .limit(1);

      if (error) {
        console.error('Database connection test failed:', error);
        return false;
      }

      console.log('✅ Database connection successful');
      return true;
    } catch (error) {
      console.error('❌ Database connection test failed:', error);
      return false;
    }
  }

  async clearExistingWords(): Promise<void> {
    try {
      console.log('🗑️ Clearing existing words from database...');
      
      const { error } = await this.supabase
        .from('words')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all rows

      if (error) {
        throw new Error(`Failed to clear existing words: ${error.message}`);
      }

      console.log('✅ Existing words cleared successfully');
    } catch (error) {
      console.error('❌ Failed to clear existing words:', error);
      throw error;
    }
  }

  async insertWord(wordData: DatabaseWord): Promise<string> {
    try {
      const { data, error } = await this.supabase
        .from('words')
        .insert([{
          word: wordData.word,
          definition: wordData.definition,
          part_of_speech: wordData.part_of_speech,
          example_sentence: wordData.example_sentence,
          synonyms: wordData.synonyms,
          antonyms: wordData.antonyms,
          tier: wordData.tier,
          difficulty: wordData.difficulty,
          image_urls: wordData.image_urls || [],
          image_descriptions: wordData.image_descriptions || []
        }])
        .select('id')
        .single();

      if (error) {
        throw new Error(`Failed to insert word "${wordData.word}": ${error.message}`);
      }

      return data.id;
    } catch (error) {
      console.error(`❌ Failed to insert word "${wordData.word}":`, error);
      throw error;
    }
  }

  async insertWordsBatch(wordsData: DatabaseWord[]): Promise<string[]> {
    try {
      console.log(`📝 Inserting batch of ${wordsData.length} words...`);
      
      const wordsToInsert = wordsData.map(word => ({
        word: word.word,
        definition: word.definition,
        part_of_speech: word.part_of_speech,
        example_sentence: word.example_sentence,
        synonyms: word.synonyms,
        antonyms: word.antonyms,
        tier: word.tier,
        difficulty: word.difficulty,
        image_urls: word.image_urls || [],
        image_descriptions: word.image_descriptions || []
      }));

      const { data, error } = await this.supabase
        .from('words')
        .insert(wordsToInsert)
        .select('id');

      if (error) {
        throw new Error(`Failed to insert batch: ${error.message}`);
      }

      const insertedIds = data.map(row => row.id);
      console.log(`✅ Successfully inserted ${insertedIds.length} words`);
      
      return insertedIds;
    } catch (error) {
      console.error('❌ Failed to insert batch:', error);
      throw error;
    }
  }

  async getWordCount(): Promise<number> {
    try {
      const { count, error } = await this.supabase
        .from('words')
        .select('*', { count: 'exact', head: true });

      if (error) {
        throw new Error(`Failed to get word count: ${error.message}`);
      }

      return count || 0;
    } catch (error) {
      console.error('❌ Failed to get word count:', error);
      throw error;
    }
  }

  async getWordsByTier(tier: string): Promise<DatabaseWord[]> {
    try {
      const { data, error } = await this.supabase
        .from('words')
        .select('*')
        .eq('tier', tier);

      if (error) {
        throw new Error(`Failed to get words for tier "${tier}": ${error.message}`);
      }

      return data || [];
    } catch (error) {
      console.error(`❌ Failed to get words for tier "${tier}":`, error);
      throw error;
    }
  }

  async wordExists(word: string): Promise<boolean> {
    try {
      const { data, error } = await this.supabase
        .from('words')
        .select('id')
        .eq('word', word)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        throw new Error(`Failed to check if word exists: ${error.message}`);
      }

      return !!data;
    } catch (error) {
      console.error(`❌ Failed to check if word exists:`, error);
      throw error;
    }
  }
}
