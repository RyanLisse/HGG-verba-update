'use client';

import type React from 'react';
import { useState } from 'react';

type InfoComponentProps = {
  tooltip_text: string;
  display_text: string;
};

const InfoComponent: React.FC<InfoComponentProps> = ({
  tooltip_text,
  display_text,
}) => {
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <div className={'flex items-center gap-2'}>
      <div
        className="relative flex cursor-pointer flex-col items-center text-text-alt-verba"
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
      >
        <p className="ml-3 text-sm">{display_text}</p>
        <div
          className={`absolute top-full left-full z-30 mt-2 w-[300px] rounded-xl bg-bg-verba p-4 text-text-alt-verba text-xs shadow-md transition-opacity duration-300 ${
            showTooltip ? 'opacity-100' : 'pointer-events-none opacity-0'
          }`}
        >
          <p className="w-full whitespace-normal text-xs">{tooltip_text}</p>
        </div>
      </div>
    </div>
  );
};

export default InfoComponent;
