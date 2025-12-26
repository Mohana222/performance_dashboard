
import React from 'react';

export const API_URL = "https://script.google.com/macros/s/AKfycbyvVMYOOMsOh9L0-Q_-cWZr_I2K__45vdvI3cuAIZVQ8yt5tT-Qsf5tQ_88PmH-1G8x/exec";

export const APP_VERSION = "1.0.0";

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
  { id: 'qc-user', label: 'QC (UserName)', icon: '✅' },
  { id: 'qc-annotator', label: 'QC (Annotator)', icon: '🛡️' },
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
      content: "Data is stored securely using Google Cloud infrastructure and is only accessible by authorized administrative personnel."
    }
  ]
};

export const ABOUT_INFO = {
  title: "About User Performance Dashboard",
  purpose: "The User Performance Dashboard is designed to provide real-time visibility into complex annotation projects.",
  audience: "This application is built for operations managers, team leads, and quality control specialists working on large-scale data labeling initiatives.",
  problemSolved: "It solves the challenge of consolidating data from multiple distributed spreadsheets into a single, cohesive interface for attendance tracking, quality analysis, and productivity monitoring."
};
