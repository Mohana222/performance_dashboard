
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

/**
 * Fetches global project list. Returns null if the request fails.
 */
export const fetchGlobalProjects = async (url: string): Promise<Project[] | null> => {
  try {
    const response = await fetch(`${url}?action=getProjects&t=${Date.now()}`, { 
      method: 'GET',
      cache: 'no-store' 
    });
    if (!response.ok) throw new Error("Server error");
    const data = await response.json();
    return data.projects || [];
  } catch (error) {
    console.error("Failed to fetch global projects:", error);
    return null; 
  }
};

/**
 * Saves project list. Action is passed in URL to ensure GAS routing.
 */
export const saveGlobalProjects = async (url: string, projects: Project[]): Promise<boolean> => {
  const fd = new URLSearchParams();
  fd.append("projects", JSON.stringify(projects));
  
  try {
    // Putting action in URL helps GAS route the request to doPost properly
    const response = await fetch(`${url}?action=saveProjects`, { 
      method: "POST", 
      body: fd 
    });
    const result = await response.json();
    return result.success;
  } catch (error) {
    console.error("Failed to save global projects:", error);
    return false;
  }
};

export const getSheetList = async (url: string): Promise<string[]> => {
  try {
    const response = await fetch(`${url}?t=${Date.now()}`);
    const data: SheetListResponse = await response.json();
    return data.sheets || [];
  } catch (error) {
    console.error("Failed to fetch sheets:", error);
    return [];
  }
};

export const getSheetData = async (url: string, sheetName: string): Promise<RawRow[]> => {
  try {
    const response = await fetch(`${url}?sheet=${encodeURIComponent(sheetName)}&t=${Date.now()}`);
    return await response.json();
  } catch (error) {
    console.error(`Failed to fetch sheet ${sheetName}:`, error);
    return [];
  }
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
    "date": ["date", "timestamp", "createdat", "day", "time"],
    "logintime": ["logintime", "login", "timein", "clockin", "login_time", "starttime"]
  };

  const possibleMatches = aliases[normalizedTarget] || [normalizedTarget];
  return keys.find(k => possibleMatches.includes(normalize(k)));
};
