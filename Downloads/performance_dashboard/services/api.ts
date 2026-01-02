
import { RawRow, Project } from '../types';

/**
 * Extracts the Google Spreadsheet ID from a full URL or returns the input if it looks like an ID.
 */
export const extractSpreadsheetId = (input: string): string => {
  const match = input.match(/\/d\/([a-zA-Z0-9-_]+)/);
  if (match && match[1]) return match[1];
  return input.trim();
};

/**
 * Discovers sheet (tab) names from a Google Spreadsheet by parsing the public HTML page.
 * Filtered by project category requirements:
 * - Production projects: Fetch sheets containing 'production' or 'qc'
 * - Hourly projects: Fetch sheets containing 'login' or 'attendance'
 */
export const fetchSheetList = async (spreadsheetId: string, category: 'production' | 'hourly'): Promise<string[]> => {
  try {
    const url = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;
    const response = await fetch(url);
    if (!response.ok) throw new Error("Spreadsheet inaccessible. Ensure it is shared as 'Anyone with the link can view'.");
    
    const html = await response.text();
    const names = new Set<string>();
    
    // Modern Google Sheets bootstrap structure: "name":"Sheet1"
    const nameRegex = /"name":"([^"]+)"/g;
    let match;
    while ((match = nameRegex.exec(html)) !== null) {
      const sheetName = match[1];
      if (sheetName && !sheetName.startsWith("__")) {
        const lowerName = sheetName.toLowerCase();
        
        // Filtering logic requested by user
        if (category === 'production') {
          if (lowerName.includes('production') || lowerName.includes('qc')) {
            names.add(sheetName);
          }
        } else if (category === 'hourly') {
          if (lowerName.includes('login') || lowerName.includes('attendance')) {
            names.add(sheetName);
          }
        }
      }
    }
    
    // Fallback for different HTML structures
    if (names.size === 0) {
      const altRegex = /\[\d+,\d+,"([^"]+)",\d+\]/g;
      while ((match = altRegex.exec(html)) !== null) {
        const sheetName = match[1];
        if (sheetName && !sheetName.startsWith("__")) {
          const lowerName = sheetName.toLowerCase();
          if (category === 'production') {
            if (lowerName.includes('production') || lowerName.includes('qc')) names.add(sheetName);
          } else if (category === 'hourly') {
            if (lowerName.includes('login') || lowerName.includes('attendance')) names.add(sheetName);
          }
        }
      }
    }

    return Array.from(names);
  } catch (error) {
    console.error(`Discovery failed for ${category} project ID:`, spreadsheetId, error);
    return [];
  }
};

/**
 * Fetches sheet data as CSV using the Gviz endpoint.
 */
export const getSheetData = async (spreadsheetId: string, sheetName: string): Promise<RawRow[]> => {
  try {
    const url = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheetName)}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Fetch failed for ${sheetName}`);

    const csvText = await response.text();
    return parseCSV(csvText);
  } catch (error) {
    console.error(`Failed to fetch sheet ${sheetName}:`, error);
    return [];
  }
};

/**
 * Simple CSV parser that handles quoted strings.
 */
function parseCSV(csv: string): RawRow[] {
  const lines: string[] = [];
  let currentLine = "";
  let inQuotes = false;

  for (let i = 0; i < csv.length; i++) {
    const char = csv[i];
    if (char === '"') inQuotes = !inQuotes;
    if (char === '\n' && !inQuotes) {
      lines.push(currentLine);
      currentLine = "";
    } else {
      currentLine += char;
    }
  }
  if (currentLine) lines.push(currentLine);
  if (lines.length < 1) return [];

  const parseLine = (line: string) => {
    const result = [];
    let cur = "";
    let q = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') {
        if (q && line[i+1] === '"') { cur += '"'; i++; }
        else q = !q;
      } else if (c === ',' && !q) {
        result.push(cur);
        cur = "";
      } else {
        cur += c;
      }
    }
    result.push(cur);
    return result;
  };

  const headers = parseLine(lines[0]).map(h => h.trim());
  return lines.slice(1).map(line => {
    const values = parseLine(line);
    const row: RawRow = {};
    headers.forEach((h, i) => {
      row[h] = values[i]?.trim() || "";
    });
    return row;
  });
}

export const fetchGlobalProjects = async (): Promise<Project[]> => {
  const saved = localStorage.getItem('dc_dashboard_v2_projects');
  return saved ? JSON.parse(saved) : [];
};

export const saveGlobalProjects = async (projects: Project[]): Promise<boolean> => {
  localStorage.setItem('dc_dashboard_v2_projects', JSON.stringify(projects));
  return true;
};

const normalize = (s: string) => s?.toString().toLowerCase().replace(/[\s\-_]+/g, "").trim() || "";

export const findKey = (keys: string[], targetName: string) => {
  if (!keys || !keys.length) return undefined;
  const normalizedTarget = normalize(targetName);
  const exactMatch = keys.find(k => normalize(k) === normalizedTarget);
  if (exactMatch) return exactMatch;

  const aliases: Record<string, string[]> = {
    "username": ["username", "user", "userid", "user_name"],
    "annotatorname": ["annotatorname", "annotator", "name", "worker", "annotator_name"],
    "frameid": ["frameid", "frame", "id", "imageid", "frame_id"],
    "numberofobjectannotated": ["numberofobjectannotated", "objects", "objectcount", "totalobjects", "annotatedobjects", "object_count"],
    "date": ["date", "timestamp", "createdat"],
    "logintime": ["logintime", "login", "timein", "clockin", "login_time", "starttime"],
    "internalqcname": ["internalqcname", "internalqc", "qcname", "qcby", "verifiedby", "qc_name", "qa_name", "qa"],
    "internalpolygonerrorcount": ["internalpolygonerrorcount", "errorcount", "errors", "polygonerrors", "error_count", "totalerrors", "internal_errors"]
  };

  const possibleMatches = aliases[normalizedTarget] || [normalizedTarget];
  return keys.find(k => possibleMatches.includes(normalize(k)));
};
