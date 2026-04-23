export type ConceptImportance = "Core" | "Useful" | "Advanced";

export interface QuickCheck {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export interface MiniTask {
  instruction: string;
  solution: string;
}

export interface SpotTheBug {
  buggyCode: string;
  fixedCode: string;
  explanation: string;
}

export interface StudyConcept {
  name: string;
  importance: ConceptImportance;
  explanation: string;
  codeExample: string;
  quickCheck: QuickCheck;
  miniTask: MiniTask;
  spotTheBug: SpotTheBug;
}

export interface StudyPlan {
  projectSummary: string;
  concepts: StudyConcept[];
}

export type ReExplainStyle = "simpler" | "analogy" | "deeper";
