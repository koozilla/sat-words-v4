-- Complete database schema for SAT Vocabulary App
-- Run this after dropping all tables to create fresh schema

-- Create custom types
CREATE TYPE word_state AS ENUM ('not_started', 'started', 'ready', 'mastered');
CREATE TYPE session_type AS ENUM ('study', 'review');
CREATE TYPE difficulty_level AS ENUM ('Easy', 'Medium', 'Hard');

-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  study_streak INTEGER DEFAULT 0,
  total_points INTEGER DEFAULT 0,
  current_tier VARCHAR(50) DEFAULT 'top_25',
  last_study_date DATE
);

-- Words table
CREATE TABLE words (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  word VARCHAR(100) UNIQUE NOT NULL,
  definition TEXT NOT NULL,
  part_of_speech VARCHAR(50) NOT NULL,
  example_sentence TEXT NOT NULL,
  synonyms TEXT[] DEFAULT '{}',
  antonyms TEXT[] DEFAULT '{}',
  tier VARCHAR(50) NOT NULL,
  difficulty difficulty_level NOT NULL,
  image_urls TEXT[] DEFAULT '{}',
  image_descriptions TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User progress table
CREATE TABLE user_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  word_id UUID REFERENCES words(id) ON DELETE CASCADE,
  state word_state NOT NULL DEFAULT 'not_started',
  study_streak INTEGER DEFAULT 0,
  review_streak INTEGER DEFAULT 0,
  last_studied TIMESTAMP WITH TIME ZONE,
  next_review_date DATE,
  review_interval INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, word_id)
);

-- Sessions table
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  session_type session_type NOT NULL,
  words_studied INTEGER DEFAULT 0,
  correct_answers INTEGER DEFAULT 0,
  words_promoted INTEGER DEFAULT 0,
  words_mastered INTEGER DEFAULT 0,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  is_guest BOOLEAN DEFAULT FALSE
);

-- Badges table
CREATE TABLE badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  description TEXT NOT NULL,
  icon VARCHAR(100) NOT NULL,
  criteria JSONB NOT NULL,
  tier VARCHAR(50) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User badges table
CREATE TABLE user_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  badge_id UUID REFERENCES badges(id) ON DELETE CASCADE,
  earned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, badge_id)
);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_badges ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can only see their own data
CREATE POLICY "Users can only see their own data" ON users
  FOR ALL USING (auth.uid() = id);

-- Users can only see their own progress
CREATE POLICY "Users can only see their own progress" ON user_progress
  FOR ALL USING (auth.uid() = user_id);

-- Users can only see their own sessions
CREATE POLICY "Users can only see their own sessions" ON sessions
  FOR ALL USING (auth.uid() = user_id);

-- Users can only see their own badges
CREATE POLICY "Users can only see their own badges" ON user_badges
  FOR ALL USING (auth.uid() = user_id);

-- Words and badges are public (no RLS needed)
-- Anyone can read words and badges

-- Create indexes for performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_words_tier ON words(tier);
CREATE INDEX idx_words_difficulty ON words(difficulty);
CREATE INDEX idx_user_progress_user_id ON user_progress(user_id);
CREATE INDEX idx_user_progress_word_id ON user_progress(word_id);
CREATE INDEX idx_user_progress_state ON user_progress(state);
CREATE INDEX idx_user_progress_next_review ON user_progress(next_review_date);
CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_type ON sessions(session_type);
CREATE INDEX idx_sessions_started_at ON sessions(started_at);
CREATE INDEX idx_badges_tier ON badges(tier);
CREATE INDEX idx_user_badges_user_id ON user_badges(user_id);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add updated_at triggers
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_progress_updated_at BEFORE UPDATE ON user_progress
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert initial badges
INSERT INTO badges (name, description, icon, criteria, tier) VALUES
('First Steps', 'Complete your first study session', '🎯', '{"sessions_completed": 1}', 'top_25'),
('Top 25 Starter', 'Master your first word from Top 25', '⭐', '{"words_mastered": 1, "tier": "top_25"}', 'top_25'),
('Top 25 Master', 'Master all words in Top 25 tier', '🏆', '{"words_mastered": 25, "tier": "top_25"}', 'top_25'),
('Streak Master', 'Maintain a 7-day study streak', '🔥', '{"streak_days": 7}', 'top_25'),
('Top 100 Explorer', 'Master your first word from Top 100', '🌟', '{"words_mastered": 1, "tier": "top_100"}', 'top_100'),
('Top 100 Master', 'Master all words in Top 100 tier', '👑', '{"words_mastered": 100, "tier": "top_100"}', 'top_100'),
('Top 200 Explorer', 'Master your first word from Top 200', '💎', '{"words_mastered": 1, "tier": "top_200"}', 'top_200'),
('Top 200 Master', 'Master all words in Top 200 tier', '🎖️', '{"words_mastered": 200, "tier": "top_200"}', 'top_200'),
('Top 300 Explorer', 'Master your first word from Top 300', '🔮', '{"words_mastered": 1, "tier": "top_300"}', 'top_300'),
('Top 300 Master', 'Master all words in Top 300 tier', '🏅', '{"words_mastered": 300, "tier": "top_300"}', 'top_300'),
('Top 400 Explorer', 'Master your first word from Top 400', '💫', '{"words_mastered": 1, "tier": "top_400"}', 'top_400'),
('Top 400 Master', 'Master all words in Top 400 tier', '🎯', '{"words_mastered": 400, "tier": "top_400"}', 'top_400'),
('Top 500 Explorer', 'Master your first word from Top 500', '🌟', '{"words_mastered": 1, "tier": "top_500"}', 'top_500'),
('SAT Vocabulary Master', 'Master all 500 SAT words', '🎓', '{"words_mastered": 500}', 'top_500'),
('Perfect Session', 'Get 100% correct in a study session', '💯', '{"perfect_session": true}', 'top_25'),
('Speed Learner', 'Complete 10 words in one session', '⚡', '{"words_in_session": 10}', 'top_25'),
('Dedicated Student', 'Study for 30 days straight', '📚', '{"streak_days": 30}', 'top_25'),
('Vocabulary Legend', 'Master 100 words total', '🏆', '{"total_words_mastered": 100}', 'top_100');

-- Verify tables were created
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_type = 'BASE TABLE'
ORDER BY table_name;
