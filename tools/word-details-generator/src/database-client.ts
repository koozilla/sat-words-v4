import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

export interface DatabaseWordDetails {
  id: string;
  word: string;
  definition: string;
  part_of_speech: string;
  example_sentence: string;
  synonyms: string[];
  antonyms: string[];
  tier: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  image_urls: string[];
  image_descriptions: string[];
}

export class DatabaseClient {
  private supabase: any;

  constructor() {
    const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase URL and key are required');
    }

    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  async getWordDetails(word: string): Promise<DatabaseWordDetails | null> {
    try {
      const { data, error } = await this.supabase
        .from('words')
        .select('*')
        .eq('word', word)
        .single();

      if (error) {
        console.error(`Error fetching word "${word}":`, error);
        return null;
      }

      return data;
    } catch (error) {
      console.error(`Error fetching word "${word}":`, error);
      return null;
    }
  }

  async getAllWords(): Promise<DatabaseWordDetails[]> {
    try {
      const { data, error } = await this.supabase
        .from('words')
        .select('*')
        .order('tier', { ascending: true });

      if (error) {
        console.error('Error fetching all words:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching all words:', error);
      return [];
    }
  }

  async updateWordImages(wordId: string, imageUrls: string[], imageDescriptions: string[]): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from('words')
        .update({
          image_urls: imageUrls,
          image_descriptions: imageDescriptions
        })
        .eq('id', wordId);

      if (error) {
        console.error(`Error updating images for word ID "${wordId}":`, error);
        return false;
      }

      return true;
    } catch (error) {
      console.error(`Error updating images for word ID "${wordId}":`, error);
      return false;
    }
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
      console.error('Database connection test failed:', error);
      return false;
    }
  }
}