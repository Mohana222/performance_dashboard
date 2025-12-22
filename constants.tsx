import React from 'react';

export const API_URL = "https://script.google.com/macros/s/AKfycbwrdK2gw3_-y0JmWTAVcB8KwUpEhFmQ6bzRwjiplHVAiQdV5uZQyq7hYZWSUhj1MAGT/exec";

export const COLORS = {
  primary: '#8B5CF6', // Violet 500
  secondary: '#EC4899', // Pink 500
  accent: '#06B6D4', // Cyan 500
  success: '#10B981', // Emerald 500
  warning: '#F59E0B', // Amber 500
  danger: '#EF4444', // Red 500
  chart: ['#8B5CF6', '#EC4899', '#06B6D4', '#10B981', '#F59E0B', '#6366F1', '#D946EF']
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