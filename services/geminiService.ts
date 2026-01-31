
import { GoogleGenAI, Type } from "@google/genai";
import { Quiz, Question, Difficulty, Language } from "../types";

/**
 * Generates a batch of quiz questions based on provided text and custom instructions using Gemini AI.
 */
export const generateQuizBatch = async (
  text: string, 
  count: number, 
  difficulty: Difficulty,
  language: Language,
  customPrompt: string = '',
  existingQuestions: Question[] = []
): Promise<{ questions: Question[], title?: string }> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const existingQuestionsPrompt = existingQuestions.length > 0 
    ? `Avoid repeating these topics or questions: ${existingQuestions.map(q => q.question).join(', ')}.`
    : '';

  const targetLang = language === 'vi' ? 'Vietnamese' : 'English';
  
  const customInstructions = customPrompt.trim() 
    ? `USER CUSTOM REQUIREMENTS: "${customPrompt}". Strictly follow these instructions.` 
    : '';

  const prompt = `Create a quiz batch with exactly ${count} questions based on: "${text}". 
  Target Difficulty: ${difficulty}. 
  Target Language: ${targetLang}. 
  ${customInstructions}
  ${existingQuestionsPrompt}
  
  REQUIREMENTS:
  1. Mix question types: some should be 'single' (1 correct answer) and some 'multiple' (2 or more correct answers).
  2. Each question MUST have exactly 4 options.
  3. All generated content MUST be in ${targetLang}.
  4. Ensure questions are high quality and strictly relevant to the text.
  5. FORMATTING:
     - STRICTLY use LaTeX for ALL mathematical expressions (e.g., $E=mc^2$, $\\sqrt{x}$, $\\frac{a}{b}$).
     - Wrap ALL inline math in '$' delimiters (e.g. $x^2$).
     - Wrap ALL block math in '$$' delimiters (e.g. $$ \\sum_{i=1}^n i $$).
     - DO NOT use Unicode equivalents for complex math (avoid ², ³, ½, √, etc. in favor of LaTeX commands).
     - Escape any dollar signs meant for currency (e.g., \\$100).
     - When writing chemical formulas, also use LaTeX (e.g., $H_2O$).`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING, description: "A catchy title for the quiz" },
            questions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  type: { type: Type.STRING, enum: ['single', 'multiple'] },
                  question: { type: Type.STRING },
                  options: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                    description: "Exactly 4 options"
                  },
                  correctIndices: { 
                    type: Type.ARRAY, 
                    items: { type: Type.INTEGER },
                    description: "The 0-based indices of the correct answer(s). For 'single' type, this array has 1 element. For 'multiple', it has 2+ elements." 
                  },
                  explanation: { type: Type.STRING },
                  difficulty: { type: Type.STRING }
                },
                required: ["id", "type", "question", "options", "correctIndices", "explanation"]
              }
            }
          },
          required: ["questions"]
        }
      }
    });

    const resultText = response.text?.trim() || "{}";
    const parsed = JSON.parse(resultText);
    return {
      questions: parsed.questions || [],
      title: parsed.title
    };
  } catch (error) {
    console.error("Gemini Error:", error);
    throw new Error(language === 'vi' ? "Không thể tạo câu hỏi. Nội dung có thể quá ngắn hoặc gặp lỗi kết nối." : "Failed to generate quiz batch.");
  }
};
