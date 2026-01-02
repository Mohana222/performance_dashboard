
export interface RawRow {
  [key: string]: string | number | null | undefined;
}

export interface Project {
  id: string;
  name: string;
  spreadsheetId: string;
  color: string;
  category: 'production' | 'hourly';
  customSheets?: string; // Comma separated list of sheet names
}

export interface Birthday {
  name: string;
  date: string; // Format: "MM-DD" (e.g., "12-25" for Dec 25th)
  role?: string;
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

export interface AttendanceData {
  name: string;
  status: 'Present' | 'Absent';
}

export type ViewType = 'overview' | 'raw' | 'annotator' | 'username' | 'qc-user' | 'qc-annotator' | 'attendance' | 'projects';

export interface LoginResponse {
  success: boolean;
  role?: 'admin' | 'user';
  message?: string;
}

export interface SheetListResponse {
  sheets: string[];
}
