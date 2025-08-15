'use client';

import Image from 'next/image';
import type React from 'react';
import { useEffect, useRef, useState } from 'react';
import { FaGithub, FaHeart, FaYoutube } from 'react-icons/fa';
import { IoDocumentTextSharp } from 'react-icons/io5';
import VerbaButton from '../Navigation/VerbaButton';

type GettingStartedComponentProps = {
  addStatusMessage: (
    message: string,
    type: 'INFO' | 'WARNING' | 'SUCCESS' | 'ERROR'
  ) => void;
};

const GettingStartedComponent: React.FC<GettingStartedComponentProps> = ({
  addStatusMessage,
}) => {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [shouldShow, setShouldShow] = useState(false);

  useEffect(() => {
    // Check if getting_started variable exists in localStorage
    const gettingStartedSeen = localStorage.getItem('getting_started');

    // Show modal if getting_started doesn't exist or is set to false
    if (!gettingStartedSeen || gettingStartedSeen === 'false') {
      setShouldShow(true);
      if (dialogRef.current) {
        dialogRef.current.showModal();
      }
    }
  }, []);

  // If we shouldn't show the component, return null
  if (!shouldShow) {
    return null;
  }

  const handleGetStarted = () => {
    // Set getting_started to true in localStorage
    localStorage.setItem('getting_started', 'true');
    setShouldShow(false);
    addStatusMessage('Achievement unlocked: Welcome to Verba!', 'SUCCESS');
  };

  return (
    <dialog className="modal" id={'Getting-Started-Modal'} ref={dialogRef}>
      <div className="modal-box w-11/12 max-w-5xl">
        <div className="hero">
          <div className="hero-content flex-row">
            <div className="text-center lg:text-left">
              <h1 className="font-bold text-2xl md:text-5xl">
                Welcome to Verba
              </h1>
              <h2 className="mt-2 text-lg md:text-2xl">
                Your Open Source RAG App
              </h2>
              <p className="py-6 text-sm md:text-base">
                Verba is an open-source application designed to offer an
                end-to-end, streamlined, and user-friendly interface for
                Retrieval-Augmented Generation (RAG) out of the box. In just a
                few easy steps, explore your datasets and extract insights with
                ease, either locally with HuggingFace and Ollama or through LLM
                providers such as Anthrophic, Cohere, and OpenAI.
              </p>
              <p className="py-6 text-sm md:text-base">
                Learn more by visiting our GitHub repository, our blog post, or
                our video on Verba. Verba is currently still in development. If
                you have any questions or find issues, please reach out to us on
                GitHub.
              </p>
              <div className="flex flex-col gap-2 md:flex-row">
                <VerbaButton
                  Icon={FaGithub}
                  onClick={() =>
                    window.open('https://github.com/weaviate/verba', '_blank')
                  }
                  title="GitHub"
                />
                <VerbaButton
                  Icon={FaYoutube}
                  onClick={() =>
                    window.open(
                      'https://www.youtube.com/watch?v=swKKRdLBhas',
                      '_blank'
                    )
                  }
                  title="YouTube"
                />
                <VerbaButton
                  Icon={IoDocumentTextSharp}
                  onClick={() =>
                    window.open(
                      'https://weaviate.io/blog/verba-open-source-rag-app',
                      '_blank'
                    )
                  }
                  title="Blog Post"
                />
              </div>
            </div>
            <div className="hidden shrink-0 md:block">
              <Image
                alt="Verba AI"
                className="rounded-lg shadow-2xl"
                height={300}
                src="https://raw.githubusercontent.com/weaviate/Verba/main/img/thumbnail.png"
                width={400}
              />
            </div>
          </div>
        </div>
        <div className="modal-action mt-6 justify-center md:justify-end">
          <form method="dialog">
            <VerbaButton
              Icon={FaHeart}
              onClick={handleGetStarted}
              selected={true}
              selected_color="bg-primary-verba"
              title="Let's get started"
              type="submit"
            />
          </form>
        </div>
      </div>
    </dialog>
  );
};

export default GettingStartedComponent;
