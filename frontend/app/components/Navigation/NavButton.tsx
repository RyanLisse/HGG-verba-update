'use client';

import type React from 'react';
import type { FaStar } from 'react-icons/fa';
import VerbaButton from './VerbaButton';

type NavbarButtonProps = {
  Icon: typeof FaStar;
  title: string;
  currentPage: string;
  setCurrentPage: (
    page: 'CHAT' | 'DOCUMENTS' | 'STATUS' | 'ADD' | 'SETTINGS' | 'RAG'
  ) => void;
  setPage: 'CHAT' | 'DOCUMENTS' | 'STATUS' | 'ADD' | 'SETTINGS' | 'RAG';
  hide: boolean;
};

const NavbarButton: React.FC<NavbarButtonProps> = ({
  Icon,
  title,
  currentPage,
  setPage,
  setCurrentPage,
  hide,
}) => {
  const isChatButton = setPage === 'CHAT';

  return (
    <VerbaButton
      disabled={hide}
      Icon={Icon}
      onClick={() => {
        setCurrentPage(setPage);
      }}
      selected={currentPage === setPage}
      selected_color="bg-primary-verba"
      title={title}
      className={isChatButton ? 'verba-chat-button' : ''}
    />
  );
};

export default NavbarButton;
