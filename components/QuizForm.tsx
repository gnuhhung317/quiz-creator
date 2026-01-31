
import React, { useRef, useState, useMemo } from 'react';
import { Difficulty, Language, Question } from '../types';
import * as pdfjsLib from 'pdfjs-dist';
import JSZip from 'jszip';
import LatexText from './LatexText';

// Set up the worker for pdf.js
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://esm.sh/pdfjs-dist@4.10.38/build/pdf.worker.min.mjs`;

interface StagedFile {
  id: string;
  name: string;
  type: 'pdf' | 'pptx' | 'docx' | 'json';
  content?: string;
  questions?: Question[];
}

interface QuizFormProps {
  onGenerate: (text: string, count: number, difficulty: Difficulty, customPrompt: string, shuffle: boolean) => void;
  onImportMerged: (quizzes: Question[][], title: string, shuffle: boolean) => void;
  isLoading: boolean;
  language: Language;
}

const QuizForm: React.FC<QuizFormProps> = ({ onGenerate, onImportMerged, isLoading, language }) => {
  const [text, setText] = useState('');
  const [customPrompt, setCustomPrompt] = useState('');
  const [count, setCount] = useState(10);
  const [difficulty, setDifficulty] = useState<Difficulty>('Mixed');
  const [isProcessing, setIsProcessing] = useState(false);
  const [shuffle, setShuffle] = useState(true);
  
  // Text Cleaning States
  const [fixSpacing, setFixSpacing] = useState(true);
  const [keywordsToRemove, setKeywordsToRemove] = useState('');
  
  const [stagedFiles, setStagedFiles] = useState<StagedFile[]>([]);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const docInputRef = useRef<HTMLInputElement>(null);

  const t = {
    en: {
      title: 'Bulk Knowledge Processor',
      desc: 'Combine PDFs, DOCX, Slides, and notes to create comprehensive quizzes.',
      source: 'Manual Notes',
      placeholder: 'Paste extra content here. Supports LaTeX math (e.g., $E=mc^2$)...',
      customLabel: 'Custom Requirements',
      customPlaceholder: 'e.g., focus on Chapter 5...',
      qCount: 'Questions',
      level: 'Difficulty',
      btn: (n: number) => `Generate ${n} Questions`,
      mergeBtn: 'Merge & Start Quizzes',
      thinking: 'AI is thinking...',
      processing: 'Processing files...',
      alert: 'Please provide content or upload files.',
      diffs: { Easy: 'Easy', Medium: 'Medium', Hard: 'Hard', Mixed: 'Mixed' },
      import: 'Import JSONs',
      uploadDoc: 'Add Document',
      staged: 'Staged Sources',
      shuffle: 'Shuffle Questions',
      clearAll: 'Clear All',
      optimization: 'Text Cleaning Options',
      fixSpacing: 'Remove extra spaces/newlines',
      removeKeywords: 'Remove specific keywords',
      keywordHint: 'Keywords (comma separated)',
      preview: 'Final Processed Text',
      chars: 'characters',
      empty: 'No content to process yet.'
    },
    vi: {
      title: 'Xử lý kiến thức hàng loạt',
      desc: 'Gộp nhiều file PDF, Word, PowerPoint và ghi chú để tạo bộ đề trắc nghiệm tổng hợp.',
      source: 'Ghi chú bổ sung',
      placeholder: 'Dán thêm nội dung tại đây. Hỗ trợ công thức toán LaTeX (vd: $E=mc^2$)...',
      customLabel: 'Yêu cầu bổ sung',
      customPlaceholder: 'vd: tập trung vào chương 5...',
      qCount: 'Số lượng câu',
      level: 'Độ khó',
      btn: (n: number) => `Tạo bộ câu hỏi ${n} câu`,
      mergeBtn: 'Gộp & Bắt đầu làm bài',
      thinking: 'AI đang phân tích...',
      processing: 'Đang xử lý file...',
      alert: 'Vui lòng nhập nội dung hoặc tải file.',
      diffs: { Easy: 'Dễ', Medium: 'Trung bình', Hard: 'Khó', Mixed: 'Hỗn hợp' },
      import: 'Nhập file JSON',
      uploadDoc: 'Thêm Tài liệu',
      staged: 'Nguồn đã tải lên',
      shuffle: 'Xáo trộn câu hỏi',
      clearAll: 'Xóa tất cả',
      optimization: 'Tùy chọn làm sạch văn bản',
      fixSpacing: 'Xóa khoảng trắng/dòng thừa',
      removeKeywords: 'Xóa từ khóa cụ thể',
      keywordHint: 'Từ khóa (ngăn cách bởi dấu phẩy)',
      preview: 'Văn bản sau xử lý',
      chars: 'ký tự',
      empty: 'Chưa có nội dung để xử lý.'
    }
  }[language];

  const cleanedText = useMemo(() => {
    const docContents = stagedFiles
      .filter(f => f.type === 'pdf' || f.type === 'pptx' || f.type === 'docx')
      .map(f => f.content)
      .join('\n\n');
    
    let combined = `${docContents}\n\n${text}`.trim();

    if (fixSpacing) {
      combined = combined.replace(/\s\s+/g, ' ').replace(/\n\s*\n/g, '\n');
    }

    if (keywordsToRemove.trim()) {
      const keys = keywordsToRemove.split(',').map(k => k.trim()).filter(k => k.length > 0);
      keys.forEach(key => {
        try {
          const regex = new RegExp(key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
          combined = combined.replace(regex, '');
        } catch (e) {
          console.warn("Invalid regex keyword:", key);
        }
      });
    }

    return combined.trim();
  }, [text, stagedFiles, fixSpacing, keywordsToRemove]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const jsonQuizzes = stagedFiles
      .filter(f => f.type === 'json' && f.questions)
      .map(f => f.questions as Question[]);

    if (jsonQuizzes.length > 0) {
      onImportMerged(jsonQuizzes, stagedFiles.filter(f => f.type === 'json').map(f => f.name).join(', '), shuffle);
    } else if (cleanedText.length > 50) {
      onGenerate(cleanedText, count, difficulty, customPrompt, shuffle);
    } else {
      alert(t.alert);
    }
  };

  const handleJsonUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []) as File[];
    if (files.length === 0) return;

    const newStaged: StagedFile[] = [];
    for (const file of files) {
      try {
        const content = await file.text();
        const parsed = JSON.parse(content);
        if (Array.isArray(parsed.questions)) {
          newStaged.push({
            id: Math.random().toString(36).substr(2, 9),
            name: file.name,
            type: 'json',
            questions: parsed.questions
          });
        }
      } catch (err) {
        console.error("Error reading JSON:", file.name, err);
      }
    }
    setStagedFiles(prev => [...prev, ...newStaged]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Helper: Extract text from PPTX (Slides)
  const extractPptxText = async (file: File): Promise<string> => {
    const zip = await JSZip.loadAsync(file);
    const slideFiles = Object.keys(zip.files).filter(k => k.match(/^ppt\/slides\/slide\d+\.xml$/));
    
    slideFiles.sort((a, b) => {
      const numA = parseInt(a.match(/slide(\d+)\.xml/)![1]);
      const numB = parseInt(b.match(/slide(\d+)\.xml/)![1]);
      return numA - numB;
    });

    let pptText = "";
    const parser = new DOMParser();

    for (const slide of slideFiles) {
      const content = await zip.files[slide].async("string");
      const xml = parser.parseFromString(content, "application/xml");
      const textNodes = xml.getElementsByTagName("a:t");
      let slideText = "";
      for (let i = 0; i < textNodes.length; i++) {
        slideText += textNodes[i].textContent + " ";
      }
      if (slideText.trim()) {
        pptText += `[Slide ${slide.match(/slide(\d+)\.xml/)![1]}]\n${slideText}\n\n`;
      }
    }
    return pptText;
  };

  // Helper: Extract text from DOCX (Word)
  const extractDocxText = async (file: File): Promise<string> => {
    const zip = await JSZip.loadAsync(file);
    const content = await zip.file("word/document.xml")?.async("string");
    
    if (!content) return "";

    const parser = new DOMParser();
    const xml = parser.parseFromString(content, "application/xml");
    const paragraphs = xml.getElementsByTagName("w:p");
    
    let docText = "";
    for (let i = 0; i < paragraphs.length; i++) {
      const texts = paragraphs[i].getElementsByTagName("w:t");
      let paraText = "";
      for (let j = 0; j < texts.length; j++) {
        paraText += texts[j].textContent;
      }
      if (paraText) {
        docText += paraText + "\n";
      }
    }
    return docText;
  };

  const handleDocUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []) as File[];
    if (files.length === 0) return;

    setIsProcessing(true);
    const newDocs: StagedFile[] = [];

    for (const file of files) {
      try {
        if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
          const arrayBuffer = await file.arrayBuffer();
          const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
          let fullText = '';
          for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            fullText += textContent.items.map((item: any) => item.str).join(' ') + '\n';
          }
          newDocs.push({
            id: Math.random().toString(36).substr(2, 9),
            name: file.name,
            type: 'pdf',
            content: fullText.trim()
          });
        } else if (
          file.type === 'application/vnd.openxmlformats-officedocument.presentationml.presentation' || 
          file.name.endsWith('.pptx')
        ) {
          const pptText = await extractPptxText(file);
          newDocs.push({
            id: Math.random().toString(36).substr(2, 9),
            name: file.name,
            type: 'pptx',
            content: pptText.trim()
          });
        } else if (
          file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
          file.name.endsWith('.docx')
        ) {
           const docText = await extractDocxText(file);
           newDocs.push({
             id: Math.random().toString(36).substr(2, 9),
             name: file.name,
             type: 'docx',
             content: docText.trim()
           });
        }
      } catch (err) {
        console.error("Doc Processing Error:", file.name, err);
      }
    }

    setStagedFiles(prev => [...prev, ...newDocs]);
    setIsProcessing(false);
    if (docInputRef.current) docInputRef.current.value = '';
  };

  const removeStaged = (id: string) => {
    setStagedFiles(prev => prev.filter(f => f.id !== id));
  };

  const hasJson = stagedFiles.some(f => f.type === 'json');
  const hasTextContent = cleanedText.length > 50;

  return (
    <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-100">
      <div className="bg-indigo-600 p-8 text-white text-center">
        <h2 className="text-3xl font-bold mb-2">{t.title}</h2>
        <p className="opacity-90">{t.desc}</p>
      </div>
      
      <div className="p-8 space-y-6">
        {stagedFiles.length > 0 && (
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-xs font-black uppercase tracking-widest text-slate-500">{t.staged} ({stagedFiles.length})</h3>
              <button type="button" onClick={() => setStagedFiles([])} className="text-[10px] font-bold text-rose-500 hover:text-rose-600 uppercase">
                {t.clearAll}
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {stagedFiles.map(file => (
                <div key={file.id} className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-sm animate-fadeIn">
                  <span className="text-lg">
                    {file.type === 'json' ? '📝' : file.type === 'pptx' ? '📊' : file.type === 'docx' ? '📘' : '📄'}
                  </span>
                  <span className="text-xs font-bold text-slate-700 truncate max-w-[150px]">{file.name}</span>
                  <button type="button" onClick={() => removeStaged(file.id)} className="text-slate-400 hover:text-rose-500 transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button
            type="button"
            onClick={() => docInputRef.current?.click()}
            disabled={isProcessing || isLoading}
            className="flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed border-slate-200 hover:border-indigo-400 hover:bg-indigo-50 transition-all font-bold text-slate-600"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            {isProcessing ? t.processing : t.uploadDoc}
          </button>
          
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isProcessing || isLoading}
            className="flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed border-slate-200 hover:border-indigo-400 hover:bg-indigo-50 transition-all font-bold text-slate-600"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            {t.import}
          </button>
        </div>

        {/* Updated input to accept PDF, PPTX, and DOCX */}
        <input 
          type="file" 
          ref={docInputRef} 
          onChange={handleDocUpload} 
          accept=".pdf, .pptx, .docx, application/pdf, application/vnd.openxmlformats-officedocument.presentationml.presentation, application/vnd.openxmlformats-officedocument.wordprocessingml.document" 
          className="hidden" 
          multiple 
        />
        <input type="file" ref={fileInputRef} onChange={handleJsonUpload} accept=".json" className="hidden" multiple />

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">{t.source}</label>
            <textarea
              className="w-full h-32 p-4 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 transition-all outline-none resize-none font-mono text-sm"
              placeholder={t.placeholder}
              value={text}
              onChange={(e) => setText(e.target.value)}
              disabled={isLoading || isProcessing}
            />
          </div>

          <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 space-y-6">
            <h4 className="text-sm font-bold text-slate-700 flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              {t.optimization}
            </h4>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <label className="flex items-center gap-3 cursor-pointer group bg-white p-3 rounded-lg border border-slate-200">
                <input 
                  type="checkbox" 
                  checked={fixSpacing} 
                  onChange={e => setFixSpacing(e.target.checked)}
                  className="w-5 h-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-xs font-semibold text-slate-600 group-hover:text-slate-900">{t.fixSpacing}</span>
              </label>
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">{t.keywordHint}</label>
              <input 
                type="text"
                value={keywordsToRemove}
                onChange={e => setKeywordsToRemove(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-1 focus:ring-indigo-500 outline-none"
                placeholder="e.g. Page 1, Draft, Confidential"
              />
            </div>

            <div className="pt-4 border-t border-slate-200">
              <div className="flex justify-between items-center mb-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-tight">{t.preview}</label>
                <span className="text-[10px] text-slate-400 font-mono">{cleanedText.length} {t.chars}</span>
              </div>
              
              <div className="p-3 bg-white border border-slate-200 rounded-lg text-[11px] font-mono text-slate-600 max-h-48 overflow-y-auto whitespace-pre-wrap leading-relaxed shadow-inner">
                {cleanedText ? <LatexText text={cleanedText} /> : <span className="italic text-slate-300">{t.empty}</span>}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 bg-indigo-50 p-4 rounded-xl border border-indigo-100">
             <input 
              type="checkbox" 
              id="shuffle" 
              checked={shuffle} 
              onChange={(e) => setShuffle(e.target.checked)} 
              className="w-5 h-5 rounded text-indigo-600 focus:ring-indigo-500"
            />
            <label htmlFor="shuffle" className="text-sm font-bold text-indigo-900 cursor-pointer">{t.shuffle}</label>
          </div>

          {(hasTextContent || hasJson) && (
            <div className="space-y-6 animate-fadeIn">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">{t.qCount}</label>
                  <div className="flex flex-wrap gap-2">
                    {[5, 10, 20, 50, 100].map(n => (
                      <button key={n} type="button" onClick={() => setCount(n)} className={`flex-1 py-2 px-3 rounded-lg border text-sm font-medium transition-all ${count === n ? 'bg-indigo-600 border-indigo-600 text-white shadow-md' : 'bg-white border-slate-200 text-slate-600 hover:border-indigo-300'}`}>{n}</button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">{t.level}</label>
                  <div className="flex flex-wrap gap-2">
                    {['Easy', 'Medium', 'Hard', 'Mixed'].map(d => (
                      <button key={d} type="button" onClick={() => setDifficulty(d as Difficulty)} className={`flex-1 py-2 px-3 rounded-lg border text-sm font-medium transition-all ${difficulty === d ? 'bg-indigo-600 border-indigo-600 text-white shadow-md' : 'bg-white border-slate-200 text-slate-600 hover:border-indigo-300'}`}>{(t.diffs as any)[d]}</button>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">{t.customLabel}</label>
                <input
                  type="text"
                  className="w-full p-4 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 transition-all outline-none"
                  placeholder={t.customPlaceholder}
                  value={customPrompt}
                  onChange={(e) => setCustomPrompt(e.target.value)}
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading || isProcessing || (!hasJson && !hasTextContent)}
            className={`w-full py-4 rounded-xl font-bold text-lg text-white transition-all transform active:scale-95 shadow-lg ${
              isLoading || isProcessing || (!hasJson && !hasTextContent) 
                ? 'bg-slate-300' 
                : 'bg-indigo-600 hover:bg-indigo-700 hover:shadow-indigo-200'
            }`}
          >
            {isLoading ? t.thinking : hasJson && !hasTextContent ? t.mergeBtn : t.btn(count)}
          </button>
        </form>
      </div>
    </div>
  );
};

export default QuizForm;
