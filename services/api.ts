
import { RawRow, LoginResponse, SheetListResponse, Project } from '../types';

export const login = async (url: string, username: string, password: string): Promise<LoginResponse> => {
  const fd = new URLSearchParams();
  fd.append("action", "login");
  fd.append("username", username);
  fd.append("password", password);

  try {
    const response = await fetch(url, { method: "POST", body: fd });
    return await response.json();
  } catch (error) {
    console.error("Login failed:", error);
    return { success: false, message: "Network error or invalid Script URL" };
  }
};

export const fetchGlobalProjects = async (url: string): Promise<Project[]> => {

  try {
    const response = await fetch(`${url}?action=getProjects`);
    const data = await response.json();
    return data.projects || [];
  } catch (error) {
    console.error("Failed to fetch global projects:", error);
    return [];
    
  }
};

export const saveGlobalProjects = async (url: string, projects: Project[]): Promise<boolean> => {
  const fd = new URLSearchParams();
  fd.append("action", "saveProjects");
  fd.append("projects", JSON.stringify(projects));

  try {
    const response = await fetch(url, { method: "POST", body: fd });
    const result = await response.json();
    return result.success;
  } catch (error) {
    console.error("Failed to save global projects:", error);
    return false;
  }
};

export const getSheetList = async (url: string): Promise<string[]> => {
  try {
    const response = await fetch(url);
    const data: SheetListResponse = await response.json();
    return data.sheets || [];
  } catch (error) {
    console.error("Failed to fetch sheets:", error);
    return [];
  }
};

export const getSheetData = async (url: string, sheetName: string): Promise<RawRow[]> => {
  try {
    const response = await fetch(`${url}?sheet=${encodeURIComponent(sheetName)}`);
    return await response.json();
  } catch (error) {
    console.error(`Failed to fetch sheet ${sheetName}:`, error);
    return [];
  }
};

/**
 * Normalizes a string for comparison by removing spaces, underscores, and case.
 */
const normalize = (s: string) => s?.toString().toLowerCase().replace(/[\s\-_]+/g, "").trim() || "";

export const findKey = (keys: string[], targetName: string) => {
  if (!keys || !keys.length) return undefined;

  const normalizedTarget = normalize(targetName);

  // Step 1: Check for exact normalized matches first to prevent collisions
  const exactMatch = keys.find(k => normalize(k) === normalizedTarget);
  if (exactMatch) return exactMatch;

  // Step 2: Fallback to common aliases if exact match fails
  const aliases: Record<string, string[]> = {
    "username": ["username", "user", "userid", "user_name"],
    "annotatorname": ["annotatorname", "annotator", "name", "worker", "annotator_name"],
    "frameid": ["frameid", "frame", "id", "imageid", "frame_id"],
    "numberofobjectannotated": ["numberofobjectannotated", "objects", "objectcount", "totalobjects", "annotatedobjects", "object_count"],
    "date": ["date", "timestamp", "createdat", "day", "time", "period", "entrydate"],
    "logintime": ["logintime", "login", "timein", "clockin", "login_time", "starttime"],
    "internalqcname": ["internalqcname", "internalqc", "qcname", "qcby", "verifiedby", "qc_name", "qa_name", "qa"],
    "internalpolygonerrorcount": ["internalpolygonerrorcount", "errorcount", "errors", "polygonerrors", "error_count", "totalerrors", "internal_errors"]
  };

  const possibleMatches = aliases[normalizedTarget] || [normalizedTarget];
  return keys.find(k => possibleMatches.includes(normalize(k)));
};

export const mergeSheetData = async (url: string, sheets: string[]): Promise<RawRow[]> => {
  const results = await Promise.all(sheets.map(s => getSheetData(url, s)));
  return results.flat();
};
