'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { WordStateManager } from '@/lib/word-state-manager';
import { guestModeManager } from '@/lib/guest-mode-manager';
import { 
  ArrowLeft, 
  ArrowRight, 
  RotateCcw, 
  CheckCircle, 
  XCircle,
  BookOpen,
  Image as ImageIcon,
  Target,
  Trophy
} from 'lucide-react';
import CelebrationAnimation from '@/components/ui/CelebrationAnimation';

interface Word {
  id: string;
  word: string;
  definition: string;
  part_of_speech: string;
  tier: string;
  difficulty: string;
  image_url?: string;
  synonyms?: string[];
  antonyms?: string[];
  example_sentence?: string;
}

interface StudySession {
  words: Word[];
  currentIndex: number;
  score: number;
  totalQuestions: number;
  answers: { [key: string]: boolean };
  promotedWords: string[]; // Track word IDs that were promoted
  startTime: Date;
  wordResults: Array<{
    wordId: string;
    word: string;
    definition: string;
    tier: string;
    correct: boolean;
    selectedAnswer: string;
    correctAnswer: string;
    fromState?: string;
    toState?: string;
  }>;
}

export default function StudySession() {
  const [session, setSession] = useState<StudySession | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAnswer, setShowAnswer] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [currentAnswers, setCurrentAnswers] = useState<string[]>([]);
  const [showCelebration, setShowCelebration] = useState(false);
  const [showWrongAnimation, setShowWrongAnimation] = useState(false);
  const [streak, setStreak] = useState(0);
  const [celebrationMessage, setCelebrationMessage] = useState('');
  const [celebrationTriggered, setCelebrationTriggered] = useState(false);
  const [showWordModal, setShowWordModal] = useState(false);
  const [showImageContent, setShowImageContent] = useState(true); // true = show image, false = show definition
  const [tierUnlocked, setTierUnlocked] = useState<{ newTier: string; previousTier: string } | null>(null);
  const [isProcessingAnswer, setIsProcessingAnswer] = useState(false);
  const [pendingAnswerData, setPendingAnswerData] = useState<{
    answer: string;
    currentWord: Word;
    correct: boolean;
  } | null>(null);
  const [isGeneratingAnswers, setIsGeneratingAnswers] = useState(false);
  const [preloadedDistractors, setPreloadedDistractors] = useState<{ [wordId: string]: string[] }>({});
  const [cachedUser, setCachedUser] = useState<any>(null);
  const [isGuest, setIsGuest] = useState(false);
  const [wordStateManager] = useState(() => new WordStateManager());
  const processedDataRef = useRef<{ answers: any; wordResults: any; score: number } | null>(null);
  const router = useRouter();
  const supabase = createClientComponentClient();

  const getCelebrationMessage = (streak: number): string => {
    if (streak === 1) return 'Good!';
    if (streak === 2) return 'Great!';
    if (streak === 3) return 'Awesome!';
    if (streak === 4) return 'Excellent!';
    if (streak === 5) return 'Fantastic!';
    if (streak === 6) return 'Incredible!';
    if (streak === 7) return 'On Fire!';
    if (streak === 8) return 'Unstoppable!';
    if (streak >= 9) return 'CRAZY~';
    return 'Correct!';
  };

  const truncateDefinition = (definition: string, maxWords: number = 20): string => {
    const words = definition.split(' ');
    if (words.length <= maxWords) return definition;
    return words.slice(0, maxWords).join(' ') + '...';
  };

  const handleImageClick = () => {
    setShowImageContent(!showImageContent);
  };

  const closeWordModal = () => {
    setShowWordModal(false);
  };

  const processAnswerData = async (answerData: { answer: string; currentWord: Word; correct: boolean }) => {
    const { answer, currentWord, correct } = answerData;
    
    console.log('=== PROCESS ANSWER DATA DEBUG ===');
    console.log('Processing answer data:', { word: currentWord.word, answer, correct });
    console.log('Current session state before processing:', {
      score: session?.score,
      answersCount: Object.keys(session?.answers || {}).length,
      answers: session?.answers,
      wordResultsCount: session?.wordResults.length
    });
    
    // Create detailed word result
    const wordResult = {
      wordId: currentWord.id,
      word: currentWord.word,
      definition: currentWord.definition,
      tier: currentWord.tier,
      correct: correct,
      selectedAnswer: answer,
      correctAnswer: currentWord.word
    };

    console.log('Created word result:', wordResult);

    // Handle word state transition
    let transition = null;
    if (isGuest) {
      // Handle guest mode word progress
      const guestData = guestModeManager.getGuestData();
      if (guestData && guestData.wordProgress[currentWord.id]) {
        const progress = guestData.wordProgress[currentWord.id];
        
        if (correct) {
          // Single correct answer moves word to mastered (same as logged-in users)
          progress.state = 'mastered';
          progress.study_streak = 0;
          transition = {
            fromState: 'started',
            toState: 'mastered'
          };
        } else {
          progress.study_streak = 0;
        }
        
        guestModeManager.updateWordProgress(currentWord.id, progress);
      }
    } else if (cachedUser) {
      transition = await wordStateManager.handleStudyAnswer(
        cachedUser.id,
        currentWord.id,
        correct
      );

      if (transition) {
        console.log('Word state transition:', transition);
        
        // Check for tier unlock
        if (transition.tierUnlocked) {
          console.log('Tier unlocked!', transition.tierUnlocked);
          setTierUnlocked(transition.tierUnlocked);
        }
      }
    } else {
      console.warn('No cached user available for word state transition');
    }

    // Update word result with transition data if available
    const finalWordResult = {
      ...wordResult,
      fromState: transition?.fromState,
      toState: transition?.toState
    };

    console.log('Final word result with transition:', finalWordResult);

    // Update session with answer data
    if (session) {
      // Check if we already have a result for this word
      const existingResultIndex = session.wordResults.findIndex(result => result.wordId === currentWord.id);
      let updatedWordResults;
      let scoreAdjustment = 0;
      
      console.log('Existing result check:', {
        wordId: currentWord.id,
        existingResultIndex,
        hasExistingResult: existingResultIndex >= 0
      });
      
      if (existingResultIndex >= 0) {
        // Replace existing result
        const existingResult = session.wordResults[existingResultIndex];
        updatedWordResults = [...session.wordResults];
        updatedWordResults[existingResultIndex] = finalWordResult;
        
        // Adjust score based on the change from existing to new result
        if (correct && !existingResult.correct) {
          scoreAdjustment = 1; // Was wrong, now correct
        } else if (!correct && existingResult.correct) {
          scoreAdjustment = -1; // Was correct, now wrong
        } // else no change needed
        
        console.log('Replacing existing result:', {
          existingResult,
          newResult: finalWordResult,
          scoreAdjustment
        });
        
      } else {
        // Add new result
        updatedWordResults = [...session.wordResults, finalWordResult];
        scoreAdjustment = correct ? 1 : 0;
        
        console.log('Adding new result:', {
          newResult: finalWordResult,
          scoreAdjustment,
          previousWordResultsCount: session.wordResults.length,
          newWordResultsCount: updatedWordResults.length
        });
      }

      const newScore = session.score + scoreAdjustment;
      
      console.log('Study session - Answer processed:', {
        word: currentWord.word,
        correct: correct,
        selectedAnswer: answer,
        scoreAdjustment: scoreAdjustment,
        oldScore: session.score,
        newScore: newScore,
        wordResultsLength: updatedWordResults.length,
        finalWordResult: finalWordResult
      });
      
      const newAnswers = {
        ...session.answers,
        [currentWord.id]: correct
      };
      
      console.log('Updated answers:', {
        wordId: currentWord.id,
        correct: correct,
        newAnswers: newAnswers,
        answersKeys: Object.keys(newAnswers),
        answersValues: Object.values(newAnswers)
      });
      
      setSession({
        ...session,
        answers: newAnswers,
        score: newScore,
        wordResults: updatedWordResults,
        promotedWords: (transition?.toState === 'ready' && transition?.fromState === 'started') 
          ? [...session.promotedWords, currentWord.id]
          : session.promotedWords
      });
      
      console.log('Session updated with new state');
      
      // Store processed data in ref for use in timeout - merge with existing data
      const existingData = processedDataRef.current;
      processedDataRef.current = {
        answers: { ...existingData?.answers, ...newAnswers },
        wordResults: [...(existingData?.wordResults || []), ...updatedWordResults],
        score: newScore // newScore is already the total score
      };
    }

    // Clear pending data and reset processing flag
    setPendingAnswerData(null);
    setIsProcessingAnswer(false);
    
    console.log('=== END PROCESS ANSWER DATA DEBUG ===');
  };


  useEffect(() => {
    initializeStudySession();
  }, []);

  // Generate answers when current word changes
  useEffect(() => {
    const generateAnswers = async () => {
      if (session && session.words.length > 0 && session.currentIndex < session.words.length) {
        console.log('useEffect triggered - current index:', session.currentIndex, 'word:', session.words[session.currentIndex]?.word);
        
        // Reset answer states when generating new answers
        setShowAnswer(false);
        setSelectedAnswer(null);
        setIsCorrect(null);
        
        setIsGeneratingAnswers(true);
        
        const currentWord = session.words[session.currentIndex];
        if (currentWord) {
          try {
            let distractors: string[];
            if (cachedUser) {
              distractors = await generateDistractors(currentWord, cachedUser.id);
            } else if (isGuest) {
              // For guest mode, use pre-loaded distractors
              distractors = preloadedDistractors[currentWord.id] || ['Option A', 'Option B', 'Option C'];
              console.log(`Using pre-loaded distractors for guest mode "${currentWord.word}":`, distractors);
            } else {
              console.warn('No cached user available for answer generation');
              distractors = ['Option A', 'Option B', 'Option C'];
            }
            
            const shuffledAnswers = [currentWord.word, ...distractors].sort(() => Math.random() - 0.5);
            console.log(`Final answers for "${currentWord.word}":`, shuffledAnswers);
            setCurrentAnswers(shuffledAnswers);
          } catch (error) {
            console.error('Error generating answers:', error);
            // Fallback answers
            setCurrentAnswers([currentWord.word, 'Option A', 'Option B', 'Option C']);
          }
        }
        
        setIsGeneratingAnswers(false);
      }
    };
    
    generateAnswers();
  }, [session?.currentIndex, session?.words]);

  const initializeStudySession = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        // Check for guest mode
        if (guestModeManager.isGuestMode()) {
          setIsGuest(true);
          await initializeGuestStudySession();
          return;
        } else {
          router.push('/auth/login');
          return;
        }
      }

      // Cache the user to avoid repeated auth calls
      setCachedUser(user);

      // Get active pool words using word state manager
      const activePoolWords = await wordStateManager.getActivePoolWords(user.id);

      if (!activePoolWords || activePoolWords.length === 0) {
        // No words in active pool - for testing, use some words from database
        console.log('No words in active pool, loading test words...');
        
        const { data: testWords, error: testError } = await supabase
          .from('words')
          .select('*')
          .eq('tier', 'top_25')
          .limit(3);

        if (testError || !testWords || testWords.length === 0) {
          router.push('/words');
          return;
        }

        const studyWords: Word[] = testWords.map(w => ({
          id: w.id,
          word: w.word,
          definition: w.definition,
          part_of_speech: w.part_of_speech,
          tier: w.tier,
          difficulty: w.difficulty,
          image_url: w.image_urls?.[0] || undefined,
          synonyms: w.synonyms || [],
          antonyms: w.antonyms || [],
          example_sentence: w.example_sentence
        }));

        // Pre-load distractors for all words
        console.log('Pre-loading distractors...');
        const distractorsMap = await preloadDistractors(studyWords);
        setPreloadedDistractors(distractorsMap);

        setSession({
          words: studyWords,
          currentIndex: 0,
          score: 0,
          totalQuestions: studyWords.length,
          answers: {},
          promotedWords: [],
          startTime: new Date(),
          wordResults: []
        });
        console.log('Study session initialized with', studyWords.length, 'words (3-question mode)');
        return;
      }

      // Use only 3 words from the active pool for the quiz
      console.log(`Found ${activePoolWords.length} words in active pool:`, activePoolWords.map(p => p.words.word));
      const selectedWords = activePoolWords.slice(0, 3); // Use only first 3 words for study session
      console.log(`Selected ${selectedWords.length} words for study session:`, selectedWords.map(p => p.words.word));
      
      const studyWords: Word[] = selectedWords.map(p => ({
        id: p.words.id,
        word: p.words.word,
        definition: p.words.definition,
        part_of_speech: p.words.part_of_speech,
        tier: p.words.tier,
        difficulty: p.words.difficulty,
        image_url: p.words.image_urls?.[0] || null,
        synonyms: p.words.synonyms || [],
        antonyms: p.words.antonyms || [],
        example_sentence: p.words.example_sentence
      }));

      // Pre-load distractors for all words
      console.log('Pre-loading distractors...');
      const distractorsMap = await preloadDistractors(studyWords);
      setPreloadedDistractors(distractorsMap);

      // Force limit to exactly 3 words for study session
      const limitedStudyWords = studyWords.slice(0, 3);
      
      setSession({
        words: limitedStudyWords,
        currentIndex: 0,
        score: 0,
        totalQuestions: limitedStudyWords.length,
        answers: {},
        promotedWords: [],
        startTime: new Date(),
        wordResults: []
      });
      console.log('Study session initialized with', limitedStudyWords.length, 'words (3-question mode)');
      console.log('Session words:', limitedStudyWords.map(w => w.word));
    } catch (error) {
      console.error('Error initializing study session:', error);
    } finally {
      setLoading(false);
    }
  };

  const initializeGuestStudySession = async () => {
    try {
      // Get guest active pool words
      const activePoolWords = guestModeManager.getActivePoolWords();
      
      if (!activePoolWords || activePoolWords.length === 0) {
        // Load Top 25 words for guest mode
        const { data: top25Words, error } = await supabase
          .from('words')
          .select('*')
          .eq('tier', 'top_25')
          .limit(10);

        if (error || !top25Words || top25Words.length === 0) {
          router.push('/dashboard');
          return;
        }

        // Add words to guest active pool
        await guestModeManager.addWordsToActivePool(top25Words);
        
        // Get updated active pool
        const updatedActivePool = guestModeManager.getActivePoolWords();
        if (updatedActivePool.length === 0) {
          router.push('/dashboard');
          return;
        }

        // Use first 3 words for study session
        const selectedWords = updatedActivePool.slice(0, 3);
        
        const studyWords: Word[] = selectedWords.map(w => ({
          id: w.id,
          word: w.word,
          definition: w.definition,
          part_of_speech: w.part_of_speech,
          tier: w.tier,
          difficulty: w.difficulty,
          image_url: w.image_urls?.[0] || undefined,
          image_urls: w.image_urls || [],
          image_descriptions: w.image_descriptions || [],
          synonyms: w.synonyms || [],
          antonyms: w.antonyms || [],
          example_sentence: w.example_sentence,
          created_at: w.created_at
        }));

        // Pre-load distractors
        const distractorsMap = await preloadDistractors(studyWords);
        setPreloadedDistractors(distractorsMap);

        setSession({
          words: studyWords,
          currentIndex: 0,
          score: 0,
          totalQuestions: studyWords.length,
          answers: {},
          promotedWords: [],
          startTime: new Date(),
          wordResults: []
        });
        
        console.log('Guest study session initialized with', studyWords.length, 'words');
        return;
      }

      // Use first 3 words from active pool
      const selectedWords = activePoolWords.slice(0, 3);
      
      const studyWords: Word[] = selectedWords.map(w => ({
        id: w.id,
        word: w.word,
        definition: w.definition,
        part_of_speech: w.part_of_speech,
        tier: w.tier,
        difficulty: w.difficulty,
        image_url: w.image_urls?.[0] || undefined,
        image_urls: w.image_urls || [],
        image_descriptions: w.image_descriptions || [],
        synonyms: w.synonyms || [],
        antonyms: w.antonyms || [],
        example_sentence: w.example_sentence,
        created_at: w.created_at
      }));

      // Pre-load distractors
      const distractorsMap = await preloadDistractors(studyWords);
      setPreloadedDistractors(distractorsMap);

      setSession({
        words: studyWords,
        currentIndex: 0,
        score: 0,
        totalQuestions: studyWords.length,
        answers: {},
        promotedWords: [],
        startTime: new Date(),
        wordResults: []
      });
      
      console.log('Guest study session initialized with', studyWords.length, 'words');
    } catch (error) {
      console.error('Error initializing guest study session:', error);
      router.push('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const preloadDistractors = async (words: Word[]): Promise<{ [wordId: string]: string[] }> => {
    console.log('Pre-loading distractors for all words...');
    const distractorsMap: { [wordId: string]: string[] } = {};
    
    // Get all unique tiers from the words
    const uniqueTiers = Array.from(new Set(words.map(w => w.tier)));
    console.log('Unique tiers found:', uniqueTiers);
    
    // Pre-load words for each tier
    for (const tier of uniqueTiers) {
      const { data: tierWords, error } = await supabase
        .from('words')
        .select('word')
        .eq('tier', tier)
        .limit(50);
      
      if (error || !tierWords) {
        console.error(`Error fetching words for tier ${tier}:`, error);
        continue;
      }
      
      const availableWords = tierWords.map(w => w.word);
      console.log(`Pre-loaded ${availableWords.length} words for tier ${tier}`);
      
      // Generate distractors for each word in this tier
      const tierWordsInSession = words.filter(w => w.tier === tier);
      for (const word of tierWordsInSession) {
        const filteredWords = availableWords.filter(w => w !== word.word);
        const distractors = filteredWords
          .sort(() => Math.random() - 0.5)
          .slice(0, 3);
        
        distractorsMap[word.id] = distractors;
      }
    }
    
    console.log('Pre-loaded distractors for', Object.keys(distractorsMap).length, 'words');
    return distractorsMap;
  };

  const generateDistractors = async (currentWord: Word, userId: string): Promise<string[]> => {
    console.log(`Getting pre-loaded distractors for "${currentWord.word}"`);
    
    // Use pre-loaded distractors if available
    if (preloadedDistractors[currentWord.id]) {
      console.log(`Using pre-loaded distractors for "${currentWord.word}":`, preloadedDistractors[currentWord.id]);
      return preloadedDistractors[currentWord.id];
    }
    
    // Fallback to old method if not pre-loaded
    console.log(`Generating distractors for "${currentWord.word}" (tier: ${currentWord.tier})`);
    
    // Get all words from the same tier from database
    const { data: tierWords, error } = await supabase
      .from('words')
      .select('word')
      .eq('tier', currentWord.tier)
      .limit(50); // Get up to 50 words from the same tier
    
    if (error || !tierWords) {
      console.error('Error fetching tier words:', error);
      return ['Option A', 'Option B', 'Option C']; // Fallback
    }
    
    // Filter out the current word and get word strings
    const availableWords = tierWords
      .map(w => w.word)
      .filter(word => word !== currentWord.word);
    
    console.log(`Found ${availableWords.length} words in tier ${currentWord.tier}:`, availableWords);
    
    // Randomly select 3 distractors
    const distractors = availableWords
      .sort(() => Math.random() - 0.5)
      .slice(0, 3);
    
    console.log(`Selected ${distractors.length} distractors:`, distractors);
    return distractors;
  };

  const handleAnswerSelect = async (answer: string) => {
    console.log('=== HANDLE ANSWER SELECT CALLED ===');
    console.log('Answer selected:', answer);
    console.log('Current session state:', {
      showAnswer,
      isProcessingAnswer,
      hasSession: !!session,
      currentIndex: session?.currentIndex,
      totalQuestions: session?.words.length
    });
    
    if (showAnswer || !session || isProcessingAnswer) {
      console.log('Early return from handleAnswerSelect:', {
        showAnswer,
        hasSession: !!session,
        isProcessingAnswer
      });
      return;
    }
    
    setIsProcessingAnswer(true);
    setSelectedAnswer(answer);
    const currentWord = session.words[session.currentIndex];
    const correct = answer === currentWord.word;
    setIsCorrect(correct);
    setShowAnswer(true);

    console.log('Answer evaluation:', {
      selectedAnswer: answer,
      correctAnswer: currentWord.word,
      isCorrect: correct,
      wordId: currentWord.id
    });

    // Store answer data for processing after celebration
    setPendingAnswerData({
      answer,
      currentWord,
      correct
    });

    console.log('Pending answer data set:', {
      answer,
      word: currentWord.word,
      correct,
      wordId: currentWord.id
    });

    // Update streak and set auto-advance for wrong answers
    if (correct && !celebrationTriggered) {
      const newStreak = streak + 1;
      const message = getCelebrationMessage(newStreak);
      console.log(`Setting celebration: streak=${newStreak}, message="${message}"`);
      console.log('About to show celebration animation...');
      console.log('Current celebration state:', { showCelebration, celebrationTriggered });
      setStreak(newStreak);
      setCelebrationMessage(message);
      setShowCelebration(true);
      setCelebrationTriggered(true);
      console.log('Celebration animation should be visible now');
      console.log('New celebration state should be:', { showCelebration: true, celebrationTriggered: true });
    } else if (!correct) {
      setStreak(0);
      setCelebrationTriggered(false);
      console.log('About to show wrong animation...');
      console.log('Current wrong animation state:', { showWrongAnimation });
      setShowWrongAnimation(true);
      console.log('Wrong animation should be visible now');
      console.log('New wrong animation state should be:', { showWrongAnimation: true });
      // Auto-advance wrong answers after animation
    } else {
      console.log('No animation triggered - conditions:', {
        correct,
        celebrationTriggered,
        reason: correct ? 'celebration already triggered' : 'not correct answer'
      });
    }

    console.log('=== END ANSWER SELECTION DEBUG ===');
    // Note: All async operations and session updates are now handled in processAnswerData
    // which is called after celebration completes
  };

  const handleCelebrationComplete = async () => {
    console.log('=== CELEBRATION COMPLETE DEBUG ===');
    console.log('Celebration complete - current index:', session?.currentIndex, 'total questions:', session?.words.length);
    console.log('Pending answer data:', pendingAnswerData);
    console.log('showCelebration state:', showCelebration);
    console.log('celebrationTriggered state:', celebrationTriggered);
    
    // Process pending answer data first (this may take time)
    if (pendingAnswerData) {
      console.log('Processing pending answer data from celebration...');
      await processAnswerData(pendingAnswerData);
      console.log('Finished processing answer data from celebration');
    } else {
      console.log('No pending answer data to process in celebration');
    }
    
    // Hide celebration after processing is complete
    setShowCelebration(false);
    setCelebrationTriggered(false);
    
    // Add a longer delay to ensure all state updates are processed
    setTimeout(async () => {
      // Use processed data from ref instead of stale session state
      const processedData = processedDataRef.current;
      console.log('Celebration timeout - checking processed data:', {
        hasProcessedData: !!processedData,
        processedAnswers: processedData?.answers,
        processedWordResults: processedData?.wordResults,
        processedScore: processedData?.score
      });
      
      // Auto-advance to next question after celebration for correct answers
      if (session && session.currentIndex < session.words.length - 1) {
        console.log('Advancing to next question from index', session.currentIndex);
        nextQuestion(false); // false = not skipped (this was a correct answer)
      } else {
        console.log('Finishing session - last question');
        // If it's the last question, finish the session
        console.log('About to finish session from celebration...');
        await finishSession();
      }
    }, 500); // Increased delay to 500ms
    
    console.log('=== END CELEBRATION COMPLETE DEBUG ===');
  };

  const handleWrongAnimationComplete = async () => {
    console.log('=== WRONG ANIMATION COMPLETE DEBUG ===');
    console.log('Wrong animation complete - current index:', session?.currentIndex, 'total questions:', session?.words.length);
    console.log('Pending answer data:', pendingAnswerData);
    
    // Process pending answer data first (this may take time)
    if (pendingAnswerData) {
      console.log('Processing pending answer data from wrong animation...');
      await processAnswerData(pendingAnswerData);
    } else {
      console.log('No pending answer data to process');
    }
    
    // Hide wrong animation after processing is complete
    setShowWrongAnimation(false);
    
    // Add a longer delay to ensure all state updates are processed
    setTimeout(() => {
      console.log('Wrong animation timeout - checking session state:', {
        currentIndex: session?.currentIndex,
        totalQuestions: session?.words.length,
        score: session?.score,
        answersCount: Object.keys(session?.answers || {}).length
      });
      
      // Auto-advance to next question after wrong animation
      if (session && session.currentIndex < session.words.length - 1) {
        nextQuestion(false); // false = not skipped (this was a wrong answer)
      } else {
        // If it's the last question, finish the session
        console.log('About to finish session from wrong animation...');
        finishSession();
      }
    }, 500); // Increased delay to 500ms
    
    console.log('=== END WRONG ANIMATION COMPLETE DEBUG ===');
  };

  const finishSession = async () => {
    if (!session) return;
    
    // Use processed data from ref if available, otherwise fall back to session state
    const processedData = processedDataRef.current;
    const effectiveAnswers = processedData?.answers || session.answers;
    const effectiveWordResults = processedData?.wordResults || session.wordResults;
    const effectiveScore = processedData?.score !== undefined ? processedData.score : session.score;
    
    console.log('finishSession called - session state:', {
      wordResultsLength: session.wordResults.length,
      wordResults: session.wordResults,
      score: session.score,
      totalQuestions: session.totalQuestions,
      currentIndex: session.currentIndex,
      wordsLength: session.words.length,
      answers: session.answers,
      answersKeys: Object.keys(session.answers),
      answersValues: Object.values(session.answers)
    });
    
    console.log('finishSession - processed data check:', {
      hasProcessedData: !!processedData,
      effectiveAnswers: effectiveAnswers,
      effectiveWordResults: effectiveWordResults,
      effectiveScore: effectiveScore
    });
    
    // Ensure we have results for all words in the session
    const allWordResults = [...effectiveWordResults];
    
    // If we're missing results for any words, create them based on effectiveAnswers
    for (let i = 0; i < session.words.length; i++) {
      const word = session.words[i];
      const hasResult = allWordResults.some(result => result.wordId === word.id);
      
      if (!hasResult) {
        console.log(`Missing result for word ${word.word}, creating from effectiveAnswers`);
        console.log(`Word ID: ${word.id}, Answer value: ${effectiveAnswers[word.id]}, Type: ${typeof effectiveAnswers[word.id]}`);
        const isCorrect = effectiveAnswers[word.id] === true;
        console.log(`Is correct: ${isCorrect}`);
        // For missing results, we don't know what the user actually selected
        // So we'll mark it as 'UNKNOWN' rather than 'SKIPPED'
        allWordResults.push({
          wordId: word.id,
          word: word.word,
          definition: word.definition,
          tier: word.tier,
          correct: isCorrect,
          selectedAnswer: isCorrect ? word.word : 'UNKNOWN',
          correctAnswer: word.word
        });
      }
    }
    
    console.log('Final word results before processing:', {
      originalLength: session.wordResults.length,
      finalLength: allWordResults.length,
      allResults: allWordResults.map(r => ({ word: r.word, correct: r.correct }))
    });
    
    // Deduplicate word results before sending to summary - keep the best entry for each word
    const uniqueResults = new Map();
    allWordResults.forEach(result => {
      // Use word text as the primary key since wordId might be inconsistent
      const wordKey = result.word;
      if (!uniqueResults.has(wordKey)) {
        uniqueResults.set(wordKey, result);
      } else {
        const existing = uniqueResults.get(wordKey);
        // Priority: 1) Results with state transition data, 2) Correct answers over incorrect ones
        const hasTransition = result.fromState && result.toState;
        const existingHasTransition = existing.fromState && existing.toState;
        
        if (!existingHasTransition && hasTransition) {
          // Replace with entry that has transition data
          uniqueResults.set(wordKey, result);
        } else if (existingHasTransition === hasTransition && result.correct && !existing.correct) {
          // If both have same transition status, prefer correct answer
          uniqueResults.set(wordKey, result);
        }
        // Otherwise keep existing entry
      }
    });
    
    const deduplicatedResults = Array.from(uniqueResults.values());
    let actualScore = deduplicatedResults.filter(r => r.correct).length;
    let actualTotalQuestions = deduplicatedResults.length;
    
    // Fallback: if no word results, use effective data
    if (actualTotalQuestions === 0) {
      console.log('No word results found, using effective data as fallback');
      actualTotalQuestions = session.totalQuestions;
      actualScore = effectiveScore;
    }
    
    console.log('After deduplication:', {
      originalCount: effectiveWordResults.length,
      deduplicatedCount: deduplicatedResults.length,
      originalScore: effectiveScore,
      actualScore: actualScore,
      actualTotalQuestions: actualTotalQuestions,
      originalWords: effectiveWordResults.map((r: any) => r.word),
      deduplicatedWords: deduplicatedResults.map((r: any) => r.word)
    });

    // Update word states for all words in the session
    if (isGuest) {
      // Handle guest mode session completion
      const sessionData = {
        session_type: 'study',
        words_studied: actualTotalQuestions,
        correct_answers: actualScore,
        words_promoted: actualScore,
        words_mastered: deduplicatedResults.filter(r => r.correct).length,
        started_at: session.startTime?.toISOString() || new Date().toISOString(),
        completed_at: new Date().toISOString(),
        wordResults: deduplicatedResults.map(result => ({
          word: result.word,
          definition: result.definition,
          correct: result.correct,
          userInput: result.selectedAnswer,
          correctAnswer: result.correctAnswer,
          tier: result.tier,
          fromState: result.fromState,
          toState: result.toState,
          wordId: result.wordId
        }))
      };
      
      // Add session to guest history
      guestModeManager.addSession(sessionData as any);
      
      console.log('Guest study session completed:', sessionData);
      const encodedData = encodeURIComponent(JSON.stringify(sessionData));
      router.push(`/study-summary?data=${encodedData}`);
      return;
    }
    
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      for (const result of effectiveWordResults) {
        if (!result.correct) {
          // For skipped/incorrect words, ensure they stay in 'started' state
          // so they can be studied again
          await wordStateManager.markWordAsStarted(user.id, result.wordId);
        }
      }
    }
    
    // Session complete - pass session data to summary
    console.log('Session being finished:', {
      totalQuestions: session.totalQuestions,
      score: effectiveScore,
      wordResultsCount: effectiveWordResults.length,
      wordResults: effectiveWordResults.map((r: any) => ({ word: r.word, correct: r.correct, wordId: r.wordId }))
    });

    const sessionData = {
      session_type: 'study',
      words_studied: actualTotalQuestions,
      correct_answers: actualScore,
      words_promoted: actualScore, // All correct answers are promoted
      words_mastered: 0,
      started_at: session.startTime?.toISOString() || new Date().toISOString(),
      completed_at: new Date().toISOString(),
      wordResults: deduplicatedResults.map(result => ({
        word: result.word,
        definition: result.definition,
        correct: result.correct,
        userInput: result.selectedAnswer,
        correctAnswer: result.correctAnswer,
        tier: result.tier,
        fromState: result.fromState,
        toState: result.toState,
        wordId: result.wordId
      }))
    };
    
    console.log('Study session - Session data being passed to summary:', sessionData);
    console.log('Study session - Word results breakdown:', {
      totalResults: sessionData.wordResults.length,
      correctResults: sessionData.wordResults.filter(r => r.correct).length,
      incorrectResults: sessionData.wordResults.filter(r => !r.correct && r.userInput !== 'SKIPPED').length,
      skippedResults: sessionData.wordResults.filter(r => r.userInput === 'SKIPPED').length,
      allResults: sessionData.wordResults.map(r => ({
        word: r.word,
        correct: r.correct,
        userInput: r.userInput,
        selectedAnswer: r.userInput
      })),
      DEBUG_SESSION_WORDS_COUNT: session.words.length,
      DEBUG_ACTUAL_SCORE: actualScore,
      DEBUG_ACTUAL_TOTAL: actualTotalQuestions
    });
    const encodedData = encodeURIComponent(JSON.stringify(sessionData));
    router.push(`/study-summary?data=${encodedData}`);
  };

  const nextQuestion = async (isSkipped = true) => {
    console.log('=== NEXT QUESTION DEBUG ===');
    console.log('nextQuestion called - current index:', session?.currentIndex, 'isSkipped:', isSkipped);
    console.log('showAnswer state:', showAnswer);
    console.log('session.answers:', session?.answers);
    console.log('session.wordResults length:', session?.wordResults.length);
    
    if (session && session.currentIndex < session.words.length - 1) {
      const currentWord = session.words[session.currentIndex];
      
      console.log('Current word:', currentWord.word);
      console.log('Has answer in session.answers:', session.answers[currentWord.id] !== undefined);
      console.log('Answer value:', session.answers[currentWord.id]);
      
      // Since there's no skip option, all answers should be processed through processAnswerData
      // Just advance to next question (answer was already processed by processAnswerData)
      console.log('Advancing to next question - old index:', session.currentIndex, 'new index:', session.currentIndex + 1);
      setSession({
        ...session,
        currentIndex: session.currentIndex + 1
      });
      
      // Reset all answer-related states immediately and aggressively
      setShowAnswer(false);
      setSelectedAnswer(null);
      setIsCorrect(null);
      setShowImageContent(true); // Reset to show image for new question
      setCurrentAnswers([]); // Clear answers - useEffect will regenerate them
      
      // Force multiple resets to ensure state is cleared
      setTimeout(() => {
        setShowAnswer(false);
        setSelectedAnswer(null);
        setIsCorrect(null);
      }, 1);
      
      setTimeout(() => {
        setShowAnswer(false);
        setSelectedAnswer(null);
        setIsCorrect(null);
      }, 50);
    } else {
      console.log('Reached end of questions, finishing session');
      finishSession();
    }
    
    console.log('=== END NEXT QUESTION DEBUG ===');
  };

  const previousQuestion = () => {
    if (session && session.currentIndex > 0) {
      setSession({
        ...session,
        currentIndex: session.currentIndex - 1
      });
      setShowAnswer(false);
      setSelectedAnswer(null);
      setIsCorrect(null);
      setShowImageContent(true); // Reset to show image for previous question
      setCurrentAnswers([]); // Reset answers to trigger regeneration
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading study session...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">No study session available</p>
          <button
            onClick={() => router.push('/dashboard')}
            className="mt-4 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const currentWord = session.words[session.currentIndex];
  const progress = ((session.currentIndex + 1) / session.totalQuestions) * 100;

  // Convert database tier to display tier
  const getDisplayTier = (dbTier: string): string => {
    const tierMapping: { [key: string]: string } = {
      'top_25': 'Top 25',
      'top_50': 'Top 50',
      'top_75': 'Top 75',
      'top_100': 'Top 100',
      'top_125': 'Top 125',
      'top_150': 'Top 150',
      'top_175': 'Top 175',
      'top_200': 'Top 200',
      'top_225': 'Top 225',
      'top_250': 'Top 250',
      'top_275': 'Top 275',
      'top_300': 'Top 300',
      'top_325': 'Top 325',
      'top_350': 'Top 350',
      'top_375': 'Top 375',
      'top_400': 'Top 400',
      'top_425': 'Top 425',
      'top_450': 'Top 450',
      'top_475': 'Top 475',
      'top_500': 'Top 500',
      'top_550': 'Top 550',
      'top_600': 'Top 600',
      'top_650': 'Top 650',
      'top_700': 'Top 700',
      'top_750': 'Top 750',
      'top_800': 'Top 800',
      'top_850': 'Top 850',
      'top_900': 'Top 900',
      'top_950': 'Top 950'
    };
    return tierMapping[dbTier] || dbTier;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-12 sm:h-16">
            {/* Back to Dashboard Button */}
            <button
              onClick={() => router.push('/dashboard')}
              className="flex items-center text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="h-5 w-5 mr-2" />
              Back to Dashboard
            </button>
            
            <div className="flex items-center space-x-4">
              {isGuest && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg px-2 py-1 sm:px-3">
                  <span className="text-yellow-800 text-xs sm:text-sm font-medium">Guest</span>
                </div>
              )}
              <button
                onClick={async () => {
                  await supabase.auth.signOut();
                  router.push('/auth/login');
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-2 sm:px-6 lg:px-8 py-2 sm:py-8">
        {/* Question Card */}
        <div className="bg-white rounded-xl shadow-lg p-2 sm:p-8 mb-2 sm:mb-8">

          {/* Progress Section */}
          <div className="mb-2 sm:mb-4">
            {/* Progress Bar */}
            <div className="mb-0">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-gray-700">
                  Question {session.currentIndex + 1} of {session.totalQuestions}
                </span>
                <span className="text-sm text-gray-500">
                  {Math.round(((session.currentIndex + 1) / session.totalQuestions) * 100)}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300 ease-out"
                  style={{ width: `${((session.currentIndex + 1) / session.totalQuestions) * 100}%` }}
                ></div>
              </div>
            </div>
            
            {/* Word Info Card */}
            <div className="bg-gray-50 rounded-lg p-2 text-center -mb-1">
              <div className="text-sm font-medium text-gray-800">
                {getDisplayTier(currentWord.tier)} • {currentWord.difficulty}
              </div>
            </div>
          </div>

          {/* Word Image/Definition Toggle */}
          {currentWord.image_url && (
            <div className="mb-2 sm:mb-4 text-center">
              <div className="relative overflow-hidden rounded-lg">
                {/* Clickable Container */}
                <div 
                  className="inline-block bg-gray-100 rounded-lg p-1 sm:p-4 cursor-pointer hover:bg-gray-200 transition-colors duration-200 select-none"
                  onClick={handleImageClick}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleImageClick();
                    }
                  }}
                  aria-label={`Click to ${showImageContent ? 'see definition for' : 'see image for'} ${currentWord.word}`}
                >
                  {showImageContent ? (
                    /* Image View */
                    <div className="relative">
                      <img 
                        src={currentWord.image_url} 
                        alt={`Visual representation of ${currentWord.word}. Click to see definition.`}
                        className="w-full h-[50vh] sm:h-[36rem] sm:w-[64rem] sm:aspect-auto object-cover rounded-lg mx-auto hover:opacity-90 transition-opacity duration-200"
                        onError={(e) => {
                          console.error('Image failed to load:', currentWord.image_url);
                          e.currentTarget.style.display = 'none';
                        }}
                        onLoad={() => {
                          console.log('Image loaded successfully:', currentWord.image_url);
                        }}
                        loading="lazy"
                        decoding="async"
                        draggable={false}
                      />
                      {/* Hint Indicator */}
                      <div className="absolute bottom-2 right-2 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded">
                        Tap for hint
                      </div>
                    </div>
                  ) : (
                    /* Definition View */
                    <div className="w-full h-[50vh] sm:h-[36rem] sm:w-[64rem] sm:aspect-auto bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg mx-auto flex flex-col justify-center text-white p-2 sm:p-6 hover:opacity-90 transition-opacity duration-200 overflow-hidden">
                      <div className="text-center w-full flex-1 flex flex-col justify-center min-h-0 overflow-hidden">
                        <div className="text-sm sm:text-base leading-relaxed max-h-full overflow-y-auto w-full overflow-x-hidden">
                          <p className="break-words hyphens-auto text-center px-2 w-full max-w-full overflow-wrap-anywhere">{currentWord.definition}</p>
                        </div>
                      </div>
                      <div className="mt-2 sm:mt-4 text-xs sm:text-sm opacity-75 text-center flex-shrink-0">
                        Tap to see image
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}


          {/* Answer Options */}
          <div className="grid grid-cols-2 gap-2 sm:gap-4 mb-2 sm:mb-4">
            {isGeneratingAnswers ? (
              // Loading state for answers
              <>
                {[1, 2, 3, 4].map((index) => (
                  <div key={index} className="w-full p-2 sm:p-4 rounded-lg border-2 border-gray-200 bg-gray-100 animate-pulse">
                    <div className="h-4 bg-gray-300 rounded w-3/4"></div>
                  </div>
                ))}
              </>
            ) : (
              // Actual answer options
              currentAnswers.map((answer, index) => {
              let buttonClass = "w-full p-2 sm:p-4 text-left rounded-lg border-2 transition-all duration-200 btn-mobile-reset ";
              
              // Only show highlighting if we're showing answers AND have a valid current word
              if (showAnswer && currentWord && currentWord.word) {
                if (answer === currentWord.word) {
                  buttonClass += "border-green-500 bg-gradient-to-r from-green-50 to-green-100 text-green-800 shadow-lg";
                } else if (answer === selectedAnswer) {
                  buttonClass += "border-red-500 bg-gradient-to-r from-red-50 to-red-100 text-red-800 shadow-lg";
                } else {
                  buttonClass += "border-gray-200 bg-gray-50 text-gray-600";
                }
              } else {
                buttonClass += "border-gray-200 bg-white hover:border-blue-300 hover:bg-blue-50 active:scale-95";
              }

              const isDisabled = showAnswer || isProcessingAnswer;
              console.log(`Answer button ${index} (${answer}):`, {
                isDisabled,
                showAnswer,
                isProcessingAnswer,
                buttonClass: buttonClass.substring(0, 50) + '...'
              });

              return (
                <button
                  key={`${session.currentIndex}-${index}-${answer}`}
                  onClick={() => {
                    console.log(`Button clicked for answer: ${answer}`);
                    handleAnswerSelect(answer);
                  }}
                  className={buttonClass}
                  disabled={isDisabled}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm sm:text-base">{answer}</span>
                    {showAnswer && currentWord && currentWord.word && answer === currentWord.word && (
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-8 w-8 sm:h-10 sm:w-10 text-green-600 flex-shrink-0 animate-pulse" />
                      </div>
                    )}
                    {showAnswer && currentWord && currentWord.word && answer === selectedAnswer && answer !== currentWord.word && (
                      <div className="flex items-center gap-2">
                        <XCircle className="h-6 w-6 sm:h-7 sm:w-7 text-red-600 flex-shrink-0" />
                      </div>
                    )}
                  </div>
                </button>
              );
            })
            )}
          </div>


          {/* Navigation - No manual navigation needed, auto-advance handles both correct and wrong answers */}
        </div>

      </main>

      {/* Celebration Animation */}
      <CelebrationAnimation 
        isVisible={showCelebration}
        onComplete={handleCelebrationComplete}
        type="duolingo"
        message={celebrationMessage}
      />

      {/* Wrong Answer Animation */}
      <CelebrationAnimation 
        isVisible={showWrongAnimation}
        onComplete={handleWrongAnimationComplete}
        type="wrong"
      />


      {/* Tier Unlocked Modal */}
      {tierUnlocked && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-8 max-w-md mx-4 text-center">
            <div className="mb-6">
              <div className="w-16 h-16 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trophy className="h-8 w-8 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">New Tier Unlocked!</h2>
              <p className="text-gray-600">
                Congratulations! You&apos;ve mastered all words in <span className="font-semibold">{tierUnlocked.previousTier}</span> and unlocked <span className="font-semibold text-blue-600">{tierUnlocked.newTier}</span>!
              </p>
            </div>
            <button
              onClick={() => setTierUnlocked(null)}
              className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold"
            >
              Continue Studying
            </button>
          </div>
        </div>
      )}

      {/* Word Details Modal */}
      {showWordModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              {/* Modal Header */}
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-bold text-gray-900">{currentWord.word}</h3>
                <button
                  onClick={closeWordModal}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                  aria-label="Close modal"
                >
                  <XCircle className="h-8 w-8" />
                </button>
              </div>

              {/* Word Image */}
              {currentWord.image_url && (
                <div className="mb-6 text-center">
                  <img 
                    src={currentWord.image_url} 
                    alt={`Visual representation of ${currentWord.word}`}
                    className="h-48 w-[20rem] sm:h-56 sm:w-[24rem] object-cover rounded-lg mx-auto"
                  />
                </div>
              )}

              {/* Word Details */}
              <div className="space-y-4">
                {/* Part of Speech */}
                <div>
                  <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">Part of Speech</h4>
                  <p className="text-lg text-gray-800">{currentWord.part_of_speech}</p>
                </div>

                {/* Definition */}
                <div>
                  <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">Definition</h4>
                  <p className="text-lg text-gray-800 break-words hyphens-auto leading-relaxed">{currentWord.definition}</p>
                </div>

                {/* Example Sentence */}
                {currentWord.example_sentence && (
                  <div>
                    <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">Example</h4>
                    <p className="text-lg text-gray-800 italic break-words hyphens-auto leading-relaxed">&ldquo;{currentWord.example_sentence}&rdquo;</p>
                  </div>
                )}

                {/* Synonyms */}
                {currentWord.synonyms && currentWord.synonyms.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">Synonyms</h4>
                    <p className="text-lg text-gray-800">{currentWord.synonyms.join(', ')}</p>
                  </div>
                )}

                {/* Antonyms */}
                {currentWord.antonyms && currentWord.antonyms.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">Antonyms</h4>
                    <p className="text-lg text-gray-800">{currentWord.antonyms.join(', ')}</p>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="mt-8 flex justify-end">
                <button
                  onClick={closeWordModal}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
