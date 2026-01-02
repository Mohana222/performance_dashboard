
import React from 'react';
import { Birthday } from '../types';

interface BirthdayNoticeProps {
  birthdays: Birthday[];
}

const BirthdayNotice: React.FC<BirthdayNoticeProps> = ({ birthdays }) => {
  if (birthdays.length === 0) return null;

  return (
    <div className="flex items-center gap-3 px-6 py-3 bg-violet-600/10 border border-violet-500/30 rounded-2xl backdrop-blur-md animate-fade-up max-w-md mx-4">
      <div className="text-2xl animate-bounce">🎂</div>
      <div className="flex flex-col min-w-0">
        <span className="text-[10px] font-black text-pink-400 uppercase tracking-widest leading-none mb-1">Celebration!</span>
        <div className="flex items-center gap-2 overflow-hidden">
          <span className="text-sm font-bold text-white whitespace-nowrap">
            Happy Birthday, {birthdays.map(b => b.name).join(' & ')}!
          </span>
          <span className="text-lg animate-pulse">✨</span>
        </div>
      </div>
    </div>
  );
};

export default BirthdayNotice;
