
import React from 'react';
import { Birthday } from './types';

export const APP_VERSION = "2.3.0";

// Hardcoded users for immediate login - Backend-less secure portal
export const VALID_USERS: Record<string, string> = {
  "admin": "admin123",
  "desicrew": "desicrew@2025",
  "viewer": "view_only"
};

/**
 * Birthday Data
 * Edit this list to add or remove birthdays.
 * Format: MM-DD (Month-Day)
 */
export const BIRTHDAYS: Birthday[] = [
  { name: "Ramu M", date: "03-06", role: "Senior Crewmate" },
  { name: "Santhiya P", date: "06-27", role: "Junior Crewmate" },
  { name: "Arun Kumar S", date: "01-02", role: "Annotator" }, 
  { name: "Ishwarya R", date: "02-04", role: "Annotator" }, 
  { name: "Surandhar D", date: "11-18", role: "Annotator" }, 
  { name: "Mariyam Nisha R", date: "01-08", role: "Annotator" }, 
  { name: "Sunparsuhail K", date: "04-07", role: "Annotator" }, 
  { name: "Eswari A", date: "05-20", role: "Annotator" }, 
  { name: "Amaravathi M", date: "03-11", role: "Annotator" }, 
  { name: "Gayathri S", date: "09-13", role: "Annotator" }, 
  { name: "Pavithra R", date: "03-08", role: "Annotator" }, 
  { name: "Boomika S", date: "08-20", role: "Annotator" }, 
  { name: "Roja V", date: "10-27", role: "Annotator" }, 
  { name: "Priyadharshini S", date: "05-04", role: "Annotator" }, 
  { name: "Ananthi K", date: "04-03", role: "Annotator" }, 
  { name: "Purushothaman S", date: "06-17", role: "Annotator" }, 
  { name: "Pavithra P", date: "07-13", role: "Annotator" }, 
  { name: "Divya S", date: "12-04", role: "Annotator" }, 
  { name: "Kiruthika P", date: "10-15", role: "Annotator" }, 
  { name: "Monisha N", date: "04-22", role: "Annotator" }, 
  { name: "Jamuna V", date: "05-15", role: "Annotator" }, 
];

export const COLORS = {
  primary: '#8B5CF6', // Violet 500
  secondary: '#EC4899', // Pink 500
  accent: '#06B6D4', // Cyan 500
  success: '#10B981', // Emerald 500
  warning: '#F59E0B', // Amber 500
  danger: '#EF4444', // Red 500
  chart: [
    '#8B5CF6', '#EC4899', '#06B6D4', '#10B981', '#F59E0B', 
    '#6366F1', '#D946EF', '#F43F5E', '#84CC16', '#0EA5E9', 
    '#A855F7', '#FB923C', '#2DD4BF', '#FACC15', '#60A5FA', 
    '#F472B6', '#C084FC', '#4ADE80', '#FB7185', '#38BDF8'
  ]
};

export const MENU_ITEMS = [
  { id: 'overview', label: 'Overview', icon: '📊' },
  { id: 'raw', label: 'Raw Data', icon: '📝' },
  { id: 'annotator', label: 'Annotator Summary', icon: '👤' },
  { id: 'username', label: 'UserName Summary', icon: '🏷️' },
  { id: 'qc-annotator', label: 'QC (Annotator)', icon: '🛡️' },
  { id: 'qc-user', label: 'QC (UserName)', icon: '✅' },
  { id: 'attendance', label: 'Attendance Summary', icon: '📅' },
] as const;

export const PRIVACY_POLICY = {
  title: "Privacy Policy",
  sections: [
    {
      heading: "Data Collection",
      content: "We collect login timestamps and user identifiers (usernames) to provide performance and attendance tracking services."
    },
    {
      heading: "Purpose of Use",
      content: "Collected data is used exclusively for internal attendance reporting, productivity analysis, and performance tracking of annotation tasks."
    },
    {
      heading: "Third-Party Sharing",
      content: "We do not share, sell, or provide any user data or performance metrics to third-party entities."
    },
    {
      heading: "Data Security",
      content: "Data is stored securely using local browser storage and fetched directly from authorized Google Sheets."
    }
  ]
};

export const ABOUT_INFO = {
  title: "About User Performance Dashboard",
  purpose: "The User Performance Dashboard provides real-time visibility into complex annotation projects directly from Google Sheets without external backends.",
  audience: "This application is built for operations managers, team leads, and quality control specialists working on large-scale data labeling initiatives.",
  problemSolved: "It eliminates the need for Apps Script maintenance by fetching data directly from public Google Sheet IDs, consolidating multiple datasets into a single analytics interface."
};
