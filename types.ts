
export interface RawRow {
  [key: string]: string | number | null | undefined;
}

export interface Project {
  id: string;
  name: string;
  url: string;
  color: string;
  category: 'production' | 'hourly';
}

export interface SummaryData {
  name: string;
  frameCount: number;
  objectCount: number;
}

export interface QCData {
  name: string;
  objectCount: number;
  errorCount: number;
}

export type ViewType = 'overview' | 'raw' | 'annotator' | 'username' | 'qc-user' | 'qc-annotator' | 'projects';

export interface LoginResponse {
  success: boolean;
  message?: string;
}

export interface SheetListResponse {
  sheets: string[];
}
