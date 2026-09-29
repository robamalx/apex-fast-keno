import React from 'react';

const MULTIPLIERS = [
  { value: '1.50x', color: 'from-cyan-400 to-blue-400' },
  { value: '3.80x', color: 'from-emerald-400 to-teal-300' },
  { value: '9.00x', color: 'from-pink-400 to-rose-400' },
  { value: '26.00x', color: 'from-purple-400 to-violet-300' },
  { value: '80.00x', color: 'from-cyan-400 to-sky-300' },
  { value: '300.00x', color: 'from-emerald-400 to-green-300' },
  { value: '1,200x', color: 'from-pink-400 to-fuchsia-400' },
];

export const MultiplierOddsStrip: React.FC = () => {
  // Duplicate array for seamless infinite marquee scroll
  const duplicatedList = [...MULTIPLIERS, ...MULTIPLIERS, ...MULTIPLIERS];

  return (
    <div className="w-full overflow-hidden py-1 relative">
      {/* Edge gradient masks for smooth fade */}
      <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-[#09070f] to-transparent z-10 pointer-events-none" />
      <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-[#09070f] to-transparent z-10 pointer-events-none" />

      {/* Auto-scrolling marquee */}
      <div className="animate-ticker flex items-center gap-2">
        {duplicatedList.map((item, idx) => (
          <div
            key={idx}
            className="bg-[#1b1728] border border-[#2a233d] hover:border-[#ec4899]/50 px-3 py-1 rounded-full flex items-center gap-1 shrink-0 shadow-sm transition-transform hover:scale-105"
          >
            <span className="text-[10px] text-slate-400 font-bold uppercase">WIN</span>
            <span
              className={`font-mono-num font-extrabold text-xs text-transparent bg-clip-text bg-gradient-to-r ${item.color}`}
            >
              {item.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
