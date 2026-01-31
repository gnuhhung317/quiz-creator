
import React, { useState } from 'react';
import QuizForm from './components/QuizForm';
import QuizPlay from './components/QuizPlay';
import QuizResult from './components/QuizResult';
import { Quiz, QuizState, Difficulty, Question, LoadingStatus, Language } from './types';
import { generateQuizBatch } from './services/geminiService';

const App: React.FC = () => {
  const [state, setState] = useState<QuizState>('IDLE');
  const [language, setLanguage] = useState<Language>('vi');
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [result, setResult] = useState<{ score: number; answers: number[][] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadingStatus, setLoadingStatus] = useState<LoadingStatus>({
    currentBatch: 0,
    totalBatches: 0,
    message: ''
  });

  const BATCH_SIZE = 20;

  const t = {
    en: {
      header: 'Master any topic with AI-crafted assessments',
      feat1: { t: 'Multi-type', d: 'Mix of single and multiple-choice questions.', i: '🔄' },
      feat2: { t: 'Mastery Loop', d: 'Retry incorrect questions until perfected.', i: '♻️' },
      feat3: { t: 'Export/Import', d: 'Save and load quizzes as local JSON files.', i: '💾' },
      analyzing: 'Analyzing Content...',
      thinking: 'Gemini is crafting the perfect quiz for you.',
      batch: (c: number, t: number) => `Batch ${c} of ${t}`,
      proTip: 'Pro tip: For 100 questions, we make multiple API calls to ensure quality.',
      questions: (n: number) => `${n} Questions`,
      genMsg: (c: number, m: number) => `Generating questions ${c} to ${m}...`,
      startMsg: 'Analyzing text and preparing first batch...',
      invalidFile: 'Invalid quiz file format.'
    },
    vi: {
      header: 'Làm chủ kiến thức với bài trắc nghiệm từ AI',
      feat1: { t: 'Đa dạng', d: 'Tự động trộn câu hỏi chọn 1 hoặc nhiều đáp án.', i: '🔄' },
      feat2: { t: 'Vòng lặp làm chủ', d: 'Làm lại các câu sai cho đến khi đúng hết.', i: '♻️' },
      feat3: { t: 'Lưu & Tải', d: 'Lưu và tải lại bài học từ file JSON cục bộ.', i: '💾' },
      analyzing: 'Đang phân tích...',
      thinking: 'Gemini đang thiết kế bài trắc nghiệm hoàn hảo cho bạn.',
      batch: (c: number, t: number) => `Đợt ${c} trên ${t}`,
      proTip: 'Mẹo: Với 100 câu hỏi, chúng tôi thực hiện nhiều lệnh gọi để đảm bảo chất lượng.',
      questions: (n: number) => `${n} câu hỏi`,
      genMsg: (c: number, m: number) => `Đang tạo câu hỏi từ ${c} đến ${m}...`,
      startMsg: 'Đang phân tích văn bản và chuẩn bị đợt đầu tiên...',
      invalidFile: 'Định dạng file không hợp lệ.'
    }
  }[language];

  // Fisher-Yates shuffle
  const shuffleArray = <T,>(array: T[]): T[] => {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  };

  const handleGenerate = async (text: string, count: number, difficulty: Difficulty, customPrompt: string, shuffle: boolean) => {
    setState('LOADING');
    setError(null);
    
    const numBatches = Math.ceil(count / BATCH_SIZE);
    let allQuestions: Question[] = [];
    let quizTitle = language === 'vi' ? 'Bài trắc nghiệm AI' : 'AI Generated Quiz';

    setLoadingStatus({ currentBatch: 0, totalBatches: numBatches, message: t.startMsg });

    try {
      for (let i = 0; i < numBatches; i++) {
        const startIdx = i * BATCH_SIZE + 1;
        const endIdx = Math.min((i + 1) * BATCH_SIZE, count);
        setLoadingStatus(prev => ({ ...prev, currentBatch: i + 1, message: t.genMsg(startIdx, endIdx) }));

        const currentRequested = Math.min(BATCH_SIZE, count - allQuestions.length);
        const batchResult = await generateQuizBatch(text, currentRequested, difficulty, language, customPrompt, allQuestions);
        
        allQuestions = [...allQuestions, ...batchResult.questions];
        if (batchResult.title && i === 0) quizTitle = batchResult.title;

        if (numBatches > 1 && i < numBatches - 1) await new Promise(r => setTimeout(r, 500));
      }

      if (shuffle) allQuestions = shuffleArray(allQuestions);

      setQuiz({ title: quizTitle, questions: allQuestions });
      setState('PLAYING');
    } catch (err: any) {
      console.error(err);
      setError(err.message || (language === 'vi' ? 'Đã xảy ra lỗi' : 'Something went wrong'));
      setState('IDLE');
    }
  };

  const handleImportMerged = (quizzes: Question[][], title: string, shuffle: boolean) => {
    let mergedQuestions = quizzes.flat();
    if (shuffle) mergedQuestions = shuffleArray(mergedQuestions);

    setQuiz({
      title: `${language === 'vi' ? 'Gộp' : 'Merged'}: ${title}`,
      questions: mergedQuestions
    });
    setState('PLAYING');
    setError(null);
  };

  const handleFinish = (score: number, answers: number[][]) => {
    setResult({ score, answers });
    setState('FINISHED');
  };

  const handleRestart = () => {
    setState('IDLE');
    setQuiz(null);
    setResult(null);
    setError(null);
  };

  const handleRetryIncorrect = (incorrectIndices: number[]) => {
    if (!quiz) return;
    const failedQuestions = incorrectIndices.map(idx => quiz.questions[idx]);
    setQuiz({
      title: `${quiz.title} (Retry)`,
      questions: failedQuestions,
      isRetry: true
    });
    setResult(null);
    setState('PLAYING');
  };

  return (
    <div className="min-h-screen pb-20 px-4 pt-8 sm:pt-12">
      <div className="max-w-4xl mx-auto flex justify-end mb-4">
        <div className="flex bg-slate-200 p-1 rounded-xl shadow-sm border border-slate-300">
          {(['en', 'vi'] as Language[]).map(lang => (
            <button key={lang} onClick={() => setLanguage(lang)} className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${language === lang ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500'}`}>
              {lang.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      <header className="max-w-4xl mx-auto text-center mb-10 animate-fadeIn">
        <h1 className="text-4xl sm:text-5xl font-black text-slate-900 mb-3 flex items-center justify-center gap-3">
          <span className="text-indigo-600">Quiz</span>Genius <span className="text-2xl">⚡️</span>
        </h1>
        <p className="text-slate-500 font-medium text-lg">{t.header}</p>
      </header>

      <main className="max-w-5xl mx-auto">
        {state === 'IDLE' && (
          <div className="animate-fadeIn">
            {error && (
              <div className="max-w-3xl mx-auto mb-6 p-4 bg-rose-50 border border-rose-100 text-rose-600 rounded-xl text-center font-medium">
                {error}
              </div>
            )}
            <QuizForm 
              onGenerate={handleGenerate} 
              onImportMerged={handleImportMerged}
              isLoading={false} 
              language={language} 
            />
          </div>
        )}

        {state === 'LOADING' && (
          <div className="flex flex-col items-center justify-center py-20 max-w-lg mx-auto text-center">
            <div className="relative w-24 h-24 mb-8">
              <div className="absolute inset-0 border-4 border-slate-100 rounded-full"></div>
              <div className="absolute inset-0 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
            <h2 className="text-2xl font-bold text-slate-800 mb-4">{loadingStatus.message}</h2>
            {loadingStatus.totalBatches > 1 && (
              <div className="w-full bg-slate-100 rounded-full h-3 mb-4 overflow-hidden">
                <div className="bg-indigo-600 h-full transition-all duration-500 ease-out" style={{ width: `${(loadingStatus.currentBatch / loadingStatus.totalBatches) * 100}%` }}></div>
              </div>
            )}
          </div>
        )}

        {state === 'PLAYING' && quiz && (
          <div className="animate-slideUp">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-slate-900">{quiz.title}</h2>
              <div className="inline-block mt-2 px-3 py-1 bg-indigo-50 text-indigo-700 text-xs font-bold rounded-full uppercase tracking-wider">
                {t.questions(quiz.questions.length)}
              </div>
            </div>
            <QuizPlay quiz={quiz} onFinish={handleFinish} language={language} />
          </div>
        )}

        {state === 'FINISHED' && quiz && result && (
          <div className="animate-slideUp">
            <QuizResult quiz={quiz} score={result.score} userAnswers={result.answers} onRestart={handleRestart} onRetryIncorrect={handleRetryIncorrect} language={language} />
          </div>
        )}
      </main>

      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fadeIn { animation: fadeIn 0.5s ease-out forwards; }
        .animate-slideUp { animation: slideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
      `}</style>
    </div>
  );
};

export default App;
