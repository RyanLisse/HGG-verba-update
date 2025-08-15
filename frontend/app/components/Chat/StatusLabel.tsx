'use client';

import type React from 'react';

type StatusLabelProps = {
  status: boolean;
  true_text: string;
  false_text: string;
};

const StatusLabel: React.FC<StatusLabelProps> = ({
  status,
  true_text,
  false_text,
}) => {
  return (
    <div
      className={`rounded-lg p-2 text-sm text-text-verba ${status ? 'bg-secondary-verba' : 'bg-bg-alt-verba text-text-alt-verba'}`}
    >
      <p
        className={`text-xs ${status ? 'text-text-verba' : 'text-text-alt-verba'}`}
      >
        {status ? true_text : false_text}
      </p>
    </div>
  );
};

export default StatusLabel;
