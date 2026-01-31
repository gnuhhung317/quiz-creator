
import React from 'react';
import { Quiz, Language } from '../types';
import LatexText from './LatexText';

interface QuizResultProps {
  quiz: Quiz;
  score: number;
  userAnswers: number[][];
  onRestart: () => void;
  onRetryIncorrect: (incorrectIndices: number[]) => void;
  language: Language;
}

const QuizResult: React.FC<QuizResultProps> = ({ quiz, score, userAnswers, onRestart, onRetryIncorrect, language }) => {
  const percentage = Math.round((score / (quiz.questions?.length || 1)) * 100);
  
  const t = {
    en: {
      excellent: 'Excellent!',
      good: 'Good Job!',
      nice: 'Nice Effort!',
      keep: 'Keep Studying!',
      score: (s: number, t: number) => `You scored ${s} out of ${t}`,
      accuracy: 'Accuracy',
      review: 'Detailed Review',
      your: 'Your answer',
      correct: 'Correct',
      restart: 'Create New Quiz',
      retry: 'Retry Incorrect Questions',
      congrats: 'Mastery Achieved! All correct.',
      export: 'Save Quiz as JSON'
    },
    vi: {
      excellent: 'Xuất sắc!',
      good: 'Làm tốt lắm!',
      nice: 'Nỗ lực tốt!',
      keep: 'Cần cố gắng thêm!',
      score: (s: number, t: number) => `Bạn đạt ${s} trên ${t} câu`,
      accuracy: 'Độ chính xác',
      review: 'Xem lại chi tiết',
      your: 'Câu trả lời của bạn',
      correct: 'Đáp án đúng',
      restart: 'Tạo bài trắc nghiệm mới',
      retry: 'Làm lại các câu sai',
      congrats: 'Tuyệt vời! Bạn đã đúng hết.',
      export: 'Lưu file JSON'
    }
  }[language];

  const incorrectIndices = (quiz.questions || [])
    .map((q, idx) => {
      const uAns = userAnswers[idx] || [];
      const cIndices = q.correctIndices || [];
      const userSet = new Set(uAns);
      const correctSet = new Set(cIndices);
      const isCorrect = userSet.size === correctSet.size && [...userSet].every(val => correctSet.has(val));
      return isCorrect ? -1 : idx;
    })
    .filter(idx => idx !== -1);

  let grade = t.excellent;
  let icon = "🏆";
  if (percentage < 80) { grade = t.good; icon = "🌟"; }
  if (percentage < 60) { grade = t.nice; icon = "💪"; }
  if (percentage < 40) { grade = t.keep; icon = "📚"; }

  const handleExport = () => {
    const dataStr = JSON.stringify(quiz, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    const exportFileDefaultName = `${quiz.title.replace(/\s+/g, '_').toLowerCase()}_quiz.json`;
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  return (
    <div className="max-w-3xl mx-auto bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-100">
      <div className="bg-indigo-600 p-12 text-center text-white">
        <div className="text-6xl mb-4">{icon}</div>
        <h2 className="text-4xl font-bold mb-2">{grade}</h2>
        <div className="text-xl opacity-90">{t.score(score, quiz.questions.length)}</div>
        
        <div className="mt-8 inline-block bg-white/20 backdrop-blur-md px-6 py-4 rounded-2xl border border-white/20">
          <div className="text-3xl font-black">{percentage}%</div>
          <div className="text-xs uppercase tracking-widest font-bold">{t.accuracy}</div>
        </div>
      </div>

      <div className="p-8 space-y-6">
        <div className="flex justify-between items-center border-b pb-4">
           <h3 className="text-lg font-bold text-slate-800">{t.review}</h3>
           {incorrectIndices.length > 0 && (
             <button
               type="button"
               onClick={() => onRetryIncorrect(incorrectIndices)}
               className="text-xs font-black uppercase text-indigo-600 hover:text-indigo-700 bg-indigo-50 px-3 py-1.5 rounded-lg transition-all active:scale-95"
             >
               {t.retry}
             </button>
           )}
        </div>

        <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
          {(quiz.questions || []).map((q, idx) => {
            const uAns = userAnswers[idx] || [];
            const cIndices = q.correctIndices || [];
            const userSet = new Set(uAns);
            const correctSet = new Set(cIndices);
            const isCorrect = userSet.size === correctSet.size && [...userSet].every(val => correctSet.has(val));
            
            return (
              <div key={idx} className={`p-4 rounded-xl border ${isCorrect ? 'border-emerald-100 bg-emerald-50/30' : 'border-rose-100 bg-rose-50/30'}`}>
                <div className="flex items-start gap-3">
                  <div className={`mt-1 shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${isCorrect ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'}`}>
                    {idx + 1}
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-slate-800 mb-2 leading-tight">
                        <LatexText text={q.question} />
                    </p>
                    <div className="text-sm text-slate-600 mb-1">
                      <span className="font-bold">{t.your}: </span>
                      {uAns.length > 0 
                        ? uAns.map(i => <LatexText key={i} text={q.options[i]} />).reduce((prev, curr) => [prev, ', ', curr])
                        : '---'}
                    </div>
                    {!isCorrect && (
                      <div className="text-sm text-emerald-700 font-bold mb-1">
                        {t.correct}: {cIndices.map(i => <LatexText key={i} text={q.options[i]} />).reduce((prev, curr) => [prev, ', ', curr])}
                      </div>
                    )}
                    <div className="text-xs text-slate-500 italic mt-2">
                        <LatexText text={q.explanation} />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="pt-6 flex flex-col sm:flex-row justify-center gap-4">
          <button
            type="button"
            onClick={onRestart}
            className="flex-1 px-8 py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl transition-all shadow-lg hover:shadow-indigo-200 active:scale-95"
          >
            {t.restart}
          </button>
          <button
            type="button"
            onClick={handleExport}
            className="flex-1 px-8 py-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-2xl transition-all active:scale-95 flex items-center justify-center gap-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            {t.export}
          </button>
        </div>
      </div>
    </div>
  );
};

export default QuizResult;
