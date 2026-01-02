import React, { useState } from 'react';
import { APP_VERSION, PRIVACY_POLICY, ABOUT_INFO } from '../constants';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

const InfoModal: React.FC<ModalProps> = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-[2rem] shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-300">
        <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
          <h2 className="text-xl font-bold text-white">{title}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors text-xl">✕</button>
        </div>
        <div className="p-8 overflow-y-auto max-h-[70vh] custom-scrollbar text-slate-300 space-y-6">
          {children}
        </div>
        <div className="p-6 border-t border-slate-800 flex justify-end">
          <button 
            onClick={onClose}
            className="px-6 py-2 bg-violet-600 hover:bg-violet-500 text-white font-bold rounded-xl transition-all"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

const InfoFooter: React.FC = () => {
  const [modal, setModal] = useState<'privacy' | 'about' | null>(null);

  return (
    <>
      <footer className="w-full py-6 px-4 mt-auto flex flex-col items-center gap-4 relative z-10">
        <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[10px] font-bold uppercase tracking-[0.2em]">
          <button 
            onClick={() => setModal('about')}
            className="text-slate-500 hover:text-violet-400 transition-colors"
          >
            About
          </button>
          <button 
            onClick={() => setModal('privacy')}
            className="text-slate-500 hover:text-violet-400 transition-colors"
          >
            Privacy Policy
          </button>
          <span className="text-slate-600 cursor-default">
            Version {APP_VERSION}
          </span>
        </div>
        
        <p className="text-[10px] text-slate-600 font-medium tracking-widest text-center">
          © {new Date().getFullYear()} User Performance Dashboard. All rights reserved.
        </p>
      </footer>

      {/* Privacy Policy Modal */}
      <InfoModal 
        isOpen={modal === 'privacy'} 
        onClose={() => setModal(null)} 
        title={PRIVACY_POLICY.title}
      >
        {PRIVACY_POLICY.sections.map((section, idx) => (
          <div key={idx} className="space-y-2">
            <h3 className="text-sm font-black text-violet-400 uppercase tracking-widest">{section.heading}</h3>
            <p className="text-sm leading-relaxed">{section.content}</p>
          </div>
        ))}
      </InfoModal>

      {/* About Modal */}
      <InfoModal 
        isOpen={modal === 'about'} 
        onClose={() => setModal(null)} 
        title={ABOUT_INFO.title}
      >
        <div className="space-y-6">
          <section className="space-y-2">
            <h3 className="text-xs font-black text-violet-400 uppercase tracking-widest">Purpose</h3>
            <p className="text-sm leading-relaxed">{ABOUT_INFO.purpose}</p>
          </section>
          <section className="space-y-2">
            <h3 className="text-xs font-black text-violet-400 uppercase tracking-widest">Target Audience</h3>
            <p className="text-sm leading-relaxed">{ABOUT_INFO.audience}</p>
          </section>
          <section className="space-y-2">
            <h3 className="text-xs font-black text-violet-400 uppercase tracking-widest">Problem Solved</h3>
            <p className="text-sm leading-relaxed">{ABOUT_INFO.problemSolved}</p>
          </section>
        </div>
      </InfoModal>
    </>
  );
};

export default InfoFooter;