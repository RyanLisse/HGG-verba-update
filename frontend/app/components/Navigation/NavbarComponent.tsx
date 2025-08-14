"use client";

import React, { useState, useEffect } from "react";

import { IoChatbubbleSharp } from "react-icons/io5";
import { IoDocumentSharp } from "react-icons/io5";
import { IoMdAddCircle } from "react-icons/io";
import { IoSettingsSharp } from "react-icons/io5";
import { FaGithub } from "react-icons/fa";
import { TiThMenu } from "react-icons/ti";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/app/components/ui/sheet";

import VerbaButton from "./VerbaButton";

import NavbarButton from "./NavButton";
import { getGitHubStars } from "./util";

interface NavbarProps {
  imageSrc: string;
  title: string;
  subtitle: string;
  version: string;
  currentPage: string;
  production: "Local" | "Demo" | "Production";
  setCurrentPage: (
    page: "CHAT" | "DOCUMENTS" | "STATUS" | "ADD" | "SETTINGS" | "RAG"
  ) => void;
}

const formatGitHubNumber = (num: number): string => {
  if (num >= 1000) {
    return (num / 1000).toFixed(1).replace(/\.0$/, "") + "k";
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
  const [gitHubStars, setGitHubStars] = useState("0");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const fetchGitHubStars = async () => {
      try {
        const response: number = await getGitHubStars();

        if (response) {
          const formatedStars = formatGitHubNumber(response);
          setGitHubStars(formatedStars);
        }
      } catch (error) {
        console.error("Failed to fetch GitHub stars:", error);
      }
    };

    fetchGitHubStars();
  }, []);

  const handleGitHubClick = () => {
    window.open(
      "https://github.com/weaviate/verba",
      "_blank",
      "noopener,noreferrer"
    );
  };

  const handleMobileMenuClick = (page: "CHAT" | "DOCUMENTS" | "STATUS" | "ADD" | "SETTINGS" | "RAG") => {
    setCurrentPage(page);
    setMobileMenuOpen(false);
  };

  return (
    <div className="flex justify-between items-center mb-10">
      {/* Logo, Title, Subtitle */}
      <div className="flex flex-row items-center gap-5">
        <img
          src={imageSrc}
          className="flex rounded-lg w-[60px] object-contain [filter:drop-shadow(0_4px_3px_rgb(0_0_0_/0.07))_drop-shadow(0_2px_2px_rgb(0_0_0_/0.06))]"
        />
        <div className="flex flex-col">
          <p className="text-xl font-bold text-text-verba">{title}</p>
          <p className="text-sm  text-text-alt-verba font-light">{subtitle}</p>
        </div>
        <div className="flex md:hidden flex-col items-center gap-3 justify-between">
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild>
              <VerbaButton Icon={TiThMenu} title="Menu" />
            </SheetTrigger>
            <SheetContent side="left" className="w-[250px]">
              <SheetHeader>
                <SheetTitle>Navigation</SheetTitle>
                <SheetDescription>
                  Select a page to navigate to
                </SheetDescription>
              </SheetHeader>
              <div className="flex flex-col gap-4 mt-6">
                <button
                  className={`text-left p-2 rounded-md hover:bg-gray-100 ${
                    currentPage === "CHAT" ? "font-bold bg-gray-100" : ""
                  }`}
                  onClick={() => handleMobileMenuClick("CHAT")}
                >
                  Chat
                </button>
                <button
                  className={`text-left p-2 rounded-md hover:bg-gray-100 ${
                    currentPage === "DOCUMENTS" ? "font-bold bg-gray-100" : ""
                  }`}
                  onClick={() => handleMobileMenuClick("DOCUMENTS")}
                >
                  Documents
                </button>
                {production !== "Demo" && (
                  <>
                    <button
                      className={`text-left p-2 rounded-md hover:bg-gray-100 ${
                        currentPage === "ADD" ? "font-bold bg-gray-100" : ""
                      }`}
                      onClick={() => handleMobileMenuClick("ADD")}
                    >
                      Import Data
                    </button>
                    <button
                      className={`text-left p-2 rounded-md hover:bg-gray-100 ${
                        currentPage === "SETTINGS" ? "font-bold bg-gray-100" : ""
                      }`}
                      onClick={() => handleMobileMenuClick("SETTINGS")}
                    >
                      Settings
                    </button>
                  </>
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      <div className="flex flex-row justify-center items-center">
        {/* Pages */}
        <div className="hidden md:flex flex-row items-center gap-3 justify-between">
          <NavbarButton
            hide={false}
            Icon={IoChatbubbleSharp}
            title="Chat"
            currentPage={currentPage}
            setCurrentPage={setCurrentPage}
            setPage="CHAT"
          />
          {production != "Demo" && (
            <NavbarButton
              hide={false}
              Icon={IoMdAddCircle}
              title="Import Data"
              currentPage={currentPage}
              setCurrentPage={setCurrentPage}
              setPage="ADD"
            />
          )}
          <NavbarButton
            hide={false}
            Icon={IoDocumentSharp}
            title="Documents"
            currentPage={currentPage}
            setCurrentPage={setCurrentPage}
            setPage="DOCUMENTS"
          />
          {production != "Demo" && (
            <NavbarButton
              hide={false}
              Icon={IoSettingsSharp}
              title="Settings"
              currentPage={currentPage}
              setCurrentPage={setCurrentPage}
              setPage="SETTINGS"
            />
          )}
          <div
            className={`sm:h-[3vh] lg:h-[5vh] mx-1 hidden md:block bg-text-alt-verba w-px`}
          ></div>
          <VerbaButton
            title={gitHubStars}
            Icon={FaGithub}
            onClick={handleGitHubClick}
            className="flex-grow"
            icon_size={14}
            disabled={false}
            selected={false}
          />
        </div>
      </div>
    </div>
  );
};

export default Navbar;