'use client';

import type React from 'react';
import type { FaStar } from 'react-icons/fa';

type VerbaButtonProps = {
  title?: string;
  Icon?: typeof FaStar;
  onClick?: (...args: unknown[]) => void;
  onMouseEnter?: (...args: unknown[]) => void;
  onMouseLeave?: (...args: unknown[]) => void;
  disabled?: boolean;
  key?: string;
  className?: string;
  type?: 'button' | 'submit' | 'reset';
  selected?: boolean;
  selected_color?: string;
  selected_text_color?: string;
  circle?: boolean;
  text_class_name?: string;
  loading?: boolean;
  text_size?: string;
  icon_size?: number;
  onClickParams?: unknown[];
};

const VerbaButton: React.FC<VerbaButtonProps> = ({
  title = '',
  key = `Button${title}`,
  Icon,
  onClick = () => {},
  onMouseEnter = () => {},
  onMouseLeave = () => {},
  disabled = false,
  className = '',
  text_class_name = '',
  selected = false,
  selected_color = 'bg-button-verba',
  selected_text_color = 'text-text-verba-button',
  text_size = 'text-xs',
  icon_size = 12,
  type = 'button',
  loading = false,
  circle = false,
  onClickParams = [],
}) => {
  return (
    <button
      className={`verba-nav-button ${selected ? 'active' : ''} ${circle ? 'rounded-full' : ''} ${className}`}
      disabled={disabled}
      key={key}
      onClick={(e) => onClick(e, ...onClickParams)}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      type={type}
    >
      {loading ? (
        <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-text-verba-button border-t-transparent" />
      ) : (
        <>
          {Icon && <Icon className="w-[20px]" size={icon_size} />}
          {title && (
            <p className={`${text_size} ${text_class_name}`} title={title}>
              {title}
            </p>
          )}
        </>
      )}
    </button>
  );
};

export default VerbaButton;
