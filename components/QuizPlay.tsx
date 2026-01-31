
import React, { useState, useEffect } from 'react';
import { Quiz, Language, Question } from '../types';
import LatexText from './LatexText';

interface QuizPlayProps {
  quiz: Quiz;
  onFinish: (score: number, userAnswers: number[][]) => void;
  language: Language;
}

const QuizPlay: React.FC<QuizPlayProps> = ({ quiz, onFinish, language }) => {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [allUserAnswers, setAllUserAnswers] = useState<number[][]>([]);
  const [showExplanation, setShowExplanation] = useState(false);
  const [currentSelected, setCurrentSelected] = useState<number[]>([]);

  const currentQuestion = quiz.questions[currentIdx];
  const progress = ((currentIdx + 1) / quiz.questions.length) * 100;

  useEffect(() => {
    // Reset selection when question changes
    setCurrentSelected([]);
    setShowExplanation(false);
  }, [currentIdx]);

  const t = {
    en: {
      q: 'Question',
      of: 'of',
      complete: 'Complete',
      confirm: 'Confirm Answer',
      finish: 'Finish Quiz',
      next: 'Next Question',
      correct: 'Correct!',
      incorrect: 'Incorrect',
      export: 'Export JSON',
      singleType: 'Single Choice',
      multipleType: 'Multiple Choice',
      selectPrompt: 'Select all correct answers'
    },
    vi: {
      q: 'Câu hỏi',
      of: 'trên',
      complete: 'Hoàn thành',
      confirm: 'Xác nhận',
      finish: 'Kết thúc',
      next: 'Câu kế tiếp',
      correct: 'Chính xác!',
      incorrect: 'Chưa đúng',
      export: 'Xuất JSON',
      singleType: 'Chọn 1 đáp án',
      multipleType: 'Chọn nhiều đáp án',
      selectPrompt: 'Chọn tất cả các đáp án đúng'
    }
  }[language];

  const handleSelect = (idx: number) => {
    if (showExplanation) return;
    
    if (currentQuestion.type === 'single') {
      setCurrentSelected([idx]);
    } else {
      // Toggle selection for multiple choice
      setCurrentSelected(prev => 
        prev.includes(idx) ? prev.filter(i => i !== idx) : [...prev, idx]
      );
    }
  };

  const handleConfirm = () => {
    if (currentSelected.length === 0) return;
    setShowExplanation(true);
  };

  const handleNext = () => {
    const newAnswers = [...allUserAnswers, currentSelected];
    setAllUserAnswers(newAnswers);
    
    if (currentIdx === quiz.questions.length - 1) {
      // Calculate final score
      const score = quiz.questions.reduce((acc, q, i) => {
        const uAns = newAnswers[i] || [];
        const cIndices = q.correctIndices || [];
        const userSet = new Set(uAns);
        const correctSet = new Set(cIndices);
        const isCorrect = userSet.size === correctSet.size && [...userSet].every(val => correctSet.has(val));
        return acc + (isCorrect ? 1 : 0);
      }, 0);
      onFinish(score, newAnswers);
    } else {
      setCurrentIdx(currentIdx + 1);
    }
  };

  const handleExport = () => {
    const dataStr = JSON.stringify(quiz, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    const exportFileDefaultName = `${quiz.title.replace(/\s+/g, '_').toLowerCase()}_quiz.json`;
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  const isCurrentCorrect = () => {
    const cIndices = currentQuestion?.correctIndices || [];
    const userSet = new Set(currentSelected);
    const correctSet = new Set(cIndices);
    return userSet.size === correctSet.size && [...userSet].every(val => correctSet.has(val));
  };

  if (!currentQuestion) return null;

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <div className="flex justify-between items-end mb-4">
          <div className="text-sm font-medium text-slate-500">
            <div className="mb-1">{t.q} {currentIdx + 1} {t.of} {quiz.questions.length}</div>
            <div className="font-bold text-indigo-600">{Math.round(progress)}% {t.complete}</div>
          </div>
          <button 
            type="button"
            onClick={handleExport}
            className="flex items-center gap-2 px-3 py-1.5 text-xs font-bold text-slate-500 hover:text-indigo-600 border border-slate-200 hover:border-indigo-200 rounded-lg bg-white transition-all active:scale-95"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            {t.export}
          </button>
        </div>
        <div className="w-full bg-slate-200 rounded-full h-2">
          <div 
            className="bg-indigo-600 h-2 rounded-full transition-all duration-500" 
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-xl p-8 border border-slate-100 min-h-[400px] flex flex-col">
        <div className="flex items-center gap-2 mb-4">
           <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
             currentQuestion.type === 'multiple' ? 'bg-amber-100 text-amber-700' : 'bg-indigo-100 text-indigo-700'
           }`}>
             {currentQuestion.type === 'multiple' ? t.multipleType : t.singleType}
           </span>
           {currentQuestion.type === 'multiple' && !showExplanation && (
             <span className="text-[10px] text-slate-400 font-medium italic">({t.selectPrompt})</span>
           )}
        </div>

        <h3 className="text-xl font-bold text-slate-800 mb-8 leading-relaxed">
          <LatexText text={currentQuestion.question} />
        </h3>

        <div className="space-y-4 mb-8">
          {(currentQuestion.options || []).map((option, idx) => {
            const isSelected = (currentSelected || []).includes(idx);
            const cIndices = currentQuestion.correctIndices || [];
            const isCorrect = cIndices.includes(idx);
            
            let bgColor = 'bg-slate-50 hover:bg-slate-100 border-slate-200';
            let textColor = 'text-slate-700';
            let iconColor = 'border-slate-300';
            
            if (isSelected) {
              bgColor = 'bg-indigo-50 border-indigo-400 ring-1 ring-indigo-400';
              textColor = 'text-indigo-900';
              iconColor = 'border-indigo-500 bg-indigo-600 text-white';
            }

            if (showExplanation) {
              if (isCorrect) {
                bgColor = 'bg-emerald-50 border-emerald-500 text-emerald-900';
                iconColor = 'bg-emerald-500 border-emerald-500 text-white';
              } else if (isSelected && !isCorrect) {
                bgColor = 'bg-rose-50 border-rose-500 text-rose-900';
                iconColor = 'bg-rose-500 border-rose-500 text-white';
              } else {
                bgColor = 'bg-slate-50 opacity-50 border-slate-200';
              }
            }

            return (
              <button
                key={idx}
                type="button"
                onClick={() => handleSelect(idx)}
                disabled={showExplanation}
                className={`w-full p-4 text-left border rounded-xl transition-all flex items-center group ${bgColor} ${textColor}`}
              >
                <span className={`w-8 h-8 rounded-full border flex items-center justify-center mr-4 text-sm font-bold shrink-0 transition-colors ${iconColor}`}>
                  {showExplanation && isCorrect ? (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  ) : showExplanation && isSelected && !isCorrect ? (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    String.fromCharCode(65 + idx)
                  )}
                </span>
                <span className="font-medium"><LatexText text={option} /></span>
              </button>
            );
          })}
        </div>

        {showExplanation && (
          <div className="mt-auto animate-fadeIn">
            <div className={`p-4 rounded-xl border mb-6 ${
              isCurrentCorrect()
                ? 'bg-emerald-50 border-emerald-100 text-emerald-800'
                : 'bg-rose-50 border-rose-100 text-rose-800'
            }`}>
              <p className="font-semibold mb-1">
                {isCurrentCorrect() ? t.correct : t.incorrect}
              </p>
              <p className="text-sm"><LatexText text={currentQuestion.explanation} /></p>
            </div>
          </div>
        )}

        <div className="mt-auto pt-4 flex justify-end">
          {!showExplanation ? (
            <button
              type="button"
              onClick={handleConfirm}
              disabled={currentSelected.length === 0}
              className={`px-8 py-3 rounded-xl font-bold text-white transition-all ${
                currentSelected.length === 0 ? 'bg-slate-300' : 'bg-indigo-600 hover:bg-indigo-700'
              }`}
            >
              {t.confirm}
            </button>
          ) : (
            <button
              type="button"
              onClick={handleNext}
              className="px-8 py-3 bg-indigo-600 hover:bg-indigo-700 rounded-xl font-bold text-white transition-all"
            >
              {currentIdx === quiz.questions.length - 1 ? t.finish : t.next}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default QuizPlay;
