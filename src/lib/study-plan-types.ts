export interface StudyConcept {
  name: string;
  explanation: string;
  codeExample: string;
}

export interface StudyQuiz {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export interface StudyPlan {
  projectSummary: string;
  concepts: StudyConcept[];
  quizzes: StudyQuiz[];
}
