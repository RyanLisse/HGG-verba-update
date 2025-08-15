'use client';

import type React from 'react';
import { useEffect, useState } from 'react';
import { FaGithub } from 'react-icons/fa';
import { IoMdAddCircle } from 'react-icons/io';
import {
  IoChatbubbleSharp,
  IoDocumentSharp,
  IoSettingsSharp,
} from 'react-icons/io5';
import { TiThMenu } from 'react-icons/ti';

import { closeOnClick } from '@/app/util';
import NavbarButton from './NavButton';
import { getGitHubStars } from './util';
import VerbaButton from './VerbaButton';

type NavbarProps = {
  imageSrc: string;
  title: string;
  subtitle: string;
  version: string;
  currentPage: string;
  production: 'Local' | 'Demo' | 'Production';
  setCurrentPage: (
    page: 'CHAT' | 'DOCUMENTS' | 'STATUS' | 'ADD' | 'SETTINGS' | 'RAG'
  ) => void;
};

const formatGitHubNumber = (num: number): string => {
  if (num >= 1000) {
    return `${(num / 1000).toFixed(1).replace(/\.0$/, '')}k`;
  }
  return num.toString();
};

const Navbar: React.FC<NavbarProps> = ({
  imageSrc,
  title,
  subtitle,
  currentPage,
  setCurrentPage,
  production,
}) => {
  const [gitHubStars, setGitHubStars] = useState('0');

  useEffect(() => {
    // Declare an asynchronous function inside the useEffect
    const fetchGitHubStars = async () => {
      try {
        // Await the asynchronous call to getGitHubStars
        const response: number = await getGitHubStars();

        if (response) {
          // Now response is the resolved value of the promise
          const formatedStars = formatGitHubNumber(response);
          setGitHubStars(formatedStars);
        }
      } catch (_error) {}
    };

    // Call the async function
    fetchGitHubStars();
  }, []);

  const handleGitHubClick = () => {
    // Open a new tab with the specified URL
    window.open(
      'https://github.com/weaviate/verba',
      '_blank',
      'noopener,noreferrer'
    );
  };

  return (
    <div className="verba-header">
      {/* Logo, Title, Subtitle */}
      <div className="verba-logo">
        <img
          className="w-[60px] rounded-lg object-contain filter-[drop-shadow(0_4px_3px_rgb(0_0_0/0.07))_drop-shadow(0_2px_2px_rgb(0_0_0/0.06))]"
          src={imageSrc}
          alt={title}
        />
        <div className="flex flex-col">
          <p className="verba-title">{title}</p>
          <p className="verba-subtitle">{subtitle}</p>
        </div>
        <div className="flex flex-col items-center justify-between gap-3 md:hidden">
          {/* Mobile menu - simplified without dropdown for now */}
          <VerbaButton Icon={TiThMenu} title="Menu" />
        </div>
      </div>

      <div className="verba-nav">
        {/* Pages */}
        <div className="hidden flex-row items-center justify-between gap-3 md:flex">
          <NavbarButton
            currentPage={currentPage}
            hide={false}
            Icon={IoChatbubbleSharp}
            setCurrentPage={setCurrentPage}
            setPage="CHAT"
            title="Chat"
          />
          {production !== 'Demo' && (
            <NavbarButton
              currentPage={currentPage}
              hide={false}
              Icon={IoMdAddCircle}
              setCurrentPage={setCurrentPage}
              setPage="ADD"
              title="Import Data"
            />
          )}
          <NavbarButton
            currentPage={currentPage}
            hide={false}
            Icon={IoDocumentSharp}
            setCurrentPage={setCurrentPage}
            setPage="DOCUMENTS"
            title="Documents"
          />
          {production !== 'Demo' && (
            <NavbarButton
              currentPage={currentPage}
              hide={false}
              Icon={IoSettingsSharp}
              setCurrentPage={setCurrentPage}
              setPage="SETTINGS"
              title="Settings"
            />
          )}
          <div
            className={
              'mx-1 hidden w-px bg-text-alt-verba sm:h-[3vh] md:block lg:h-[5vh]'
            }
          />
          <VerbaButton
            className="grow"
            disabled={false}
            Icon={FaGithub}
            icon_size={14}
            onClick={handleGitHubClick}
            selected={false}
            title={gitHubStars}
          />
        </div>
      </div>
    </div>
  );
};

export default Navbar;
