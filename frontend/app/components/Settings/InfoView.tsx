"use client";

import React, { useState, useEffect } from "react";
import { Credentials, NodePayload, CollectionPayload } from "@/app/types";
import { IoTrash, IoDocumentSharp, IoReload } from "react-icons/io5";
import { FaWrench } from "react-icons/fa";
import { deleteAllDocuments, fetchMeta } from "@/app/api";
import { Spinner } from "@/app/components/ui/spinner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/app/components/ui/dialog";

import VerbaButton from "../Navigation/VerbaButton";

interface InfoViewProps {
  credentials: Credentials;
  addStatusMessage: (
    message: string,
    type: "INFO" | "WARNING" | "SUCCESS" | "ERROR"
  ) => void;
}

const InfoView: React.FC<InfoViewProps> = ({
  credentials,
  addStatusMessage,
}) => {
  const [nodePayload, setNodePayload] = useState<NodePayload | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [collectionPayload, setCollectionPayload] =
    useState<CollectionPayload | null>(null);

  const fetchMetadata = async () => {
    setIsLoading(true);
    const metaData = await fetchMeta(credentials);
    if (metaData?.error === "") {
      setNodePayload(metaData.node_payload);
      setCollectionPayload(metaData.collection_payload);
      setIsLoading(false);
    } else {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    setIsLoading(true);
    fetchMetadata();
    setIsLoading(false);
  }, []);

  const resetDocuments = async () => {
    const response = await deleteAllDocuments("DOCUMENTS", credentials);
    if (response) {
      addStatusMessage("All documents reset", "SUCCESS");
      fetchMetadata();
    } else {
      addStatusMessage("Failed to reset documents", "ERROR");
    }
  };

  const resetVerba = async () => {
    const response = await deleteAllDocuments("ALL", credentials);
    if (response) {
      addStatusMessage("Verba reset", "SUCCESS");
      fetchMetadata();
    } else {
      addStatusMessage("Failed to reset Verba", "ERROR");
    }
  };

  const resetConfig = async () => {
    const response = await deleteAllDocuments("CONFIG", credentials);
    if (response) {
      addStatusMessage("Config reset", "SUCCESS");
      fetchMetadata();
    } else {
      addStatusMessage("Failed to reset config", "ERROR");
    }
  };

  const resetSuggestions = async () => {
    const response = await deleteAllDocuments("SUGGESTIONS", credentials);
    if (response) {
      addStatusMessage("Suggestions reset", "SUCCESS");
      fetchMetadata();
    } else {
      addStatusMessage("Failed to reset suggestions", "ERROR");
    }
  };

  const [openDoc, setOpenDoc] = useState(false);
  const [openCfg, setOpenCfg] = useState(false);
  const [openAll, setOpenAll] = useState(false);
  const [openSug, setOpenSug] = useState(false);

  return (
    <div className="flex flex-col w-full h-full p-4">
      <div className="flex justify-between items-center mb-4">
        <p className="text-2xl font-bold">Admin Panel</p>
        <VerbaButton
          title="Refresh"
          loading={isLoading}
          onClick={fetchMetadata}
          className="max-w-min"
          Icon={IoReload}
        />
      </div>
      <div className="flex-grow overflow-y-auto">
        <div className="gap-4 flex flex-col p-4 text-text-verba">
          <p className="font-bold text-lg">Resetting Verba</p>
          <div className="flex flex-wrap gap-2 justify-between">
            <div className="flex flex-wrap gap-2">
              <Dialog open={openDoc} onOpenChange={setOpenDoc}>
                <DialogTrigger asChild>
                  <div>
                    <VerbaButton title="Clear Documents" Icon={IoDocumentSharp} />
                  </div>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Reset Documents</DialogTitle>
                  </DialogHeader>
                  <p>Are you sure you want to reset all documents? This will clear all documents and chunks from Verba.</p>
                  <div className="flex gap-2 justify-end pt-2">
                    <VerbaButton title="Cancel" selected selected_color="bg-warning-verba" onClick={() => setOpenDoc(false)} />
                    <VerbaButton title="Reset" onClick={() => { setOpenDoc(false); resetDocuments(); }} />
                  </div>
                </DialogContent>
              </Dialog>

              <Dialog open={openCfg} onOpenChange={setOpenCfg}>
                <DialogTrigger asChild>
                  <div>
                    <VerbaButton title="Clear Config" Icon={FaWrench} />
                  </div>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Reset Config</DialogTitle>
                  </DialogHeader>
                  <p>Are you sure you want to reset the config?</p>
                  <div className="flex gap-2 justify-end pt-2">
                    <VerbaButton title="Cancel" selected selected_color="bg-warning-verba" onClick={() => setOpenCfg(false)} />
                    <VerbaButton title="Reset" onClick={() => { setOpenCfg(false); resetConfig(); }} />
                  </div>
                </DialogContent>
              </Dialog>

              <Dialog open={openAll} onOpenChange={setOpenAll}>
                <DialogTrigger asChild>
                  <div>
                    <VerbaButton title="Clear Everything" Icon={IoTrash} />
                  </div>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Reset Verba</DialogTitle>
                  </DialogHeader>
                  <p>Are you sure you want to reset Verba? This will delete all collections related to Verba.</p>
                  <div className="flex gap-2 justify-end pt-2">
                    <VerbaButton title="Cancel" selected selected_color="bg-warning-verba" onClick={() => setOpenAll(false)} />
                    <VerbaButton title="Reset" onClick={() => { setOpenAll(false); resetVerba(); }} />
                  </div>
                </DialogContent>
              </Dialog>

              <Dialog open={openSug} onOpenChange={setOpenSug}>
                <DialogTrigger asChild>
                  <div>
                    <VerbaButton title="Clear Suggestions" Icon={IoTrash} />
                  </div>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Reset Suggestions</DialogTitle>
                  </DialogHeader>
                  <p>Are you sure you want to reset all autocomplete suggestions?</p>
                  <div className="flex gap-2 justify-end pt-2">
                    <VerbaButton title="Cancel" selected selected_color="bg-warning-verba" onClick={() => setOpenSug(false)} />
                    <VerbaButton title="Reset" onClick={() => { setOpenSug(false); resetSuggestions(); }} />
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
          <p className="font-bold text-lg">Weaviate Information</p>

          <div className="flex flex-col border-2 gap-2 border-bg-verba shadow-sm p-4 rounded-lg">
            <p className="text-sm lg:text-base font-semibold text-text-alt-verba">
              Connected to
            </p>
            <p className="   text-text-verba">{credentials.url}</p>
          </div>

          <div className="flex flex-col border-2 gap-2 border-bg-verba shadow-sm p-4 rounded-lg">
            <p className="text-sm lg:text-base font-semibold text-text-alt-verba">
              Deployment
            </p>
            <p className=" text-text-verba">{credentials.deployment}</p>
          </div>

          <div className="flex flex-col border-2 gap-2 border-secondary-verba shadow-sm p-4 rounded-lg">
            <p className="text-sm lg:text-base font-semibold text-text-alt-verba">
              Version
            </p>
            {nodePayload ? (
              <p className="text-text-verba">{nodePayload.weaviate_version}</p>
            ) : (
              <Spinner />
            )}
          </div>

          <div className="flex flex-col border-2 border-bg-verba shadow-sm p-4 rounded-lg">
            <div className="flex gap-2 items-center">
              <p className="text-text-alt-verba text-sm lg:text-base font-semibold">
                Nodes
              </p>
              {nodePayload ? (
                <p className="text-text-alt-verba text-sm lg:text-base font-semibold">
                  {nodePayload.node_count}
                </p>
              ) : (
              <Spinner />
            )}
            </div>

            {nodePayload ? (
              <ul className="flex flex-col mt-2 list-disc list-inside">
                {nodePayload.nodes.map((node) => (
                  <li
                    key={"Node" + node.name}
                    className="text-sm text-text-verba flex justify-between"
                  >
                    <span className="w-64 truncate">{node.name}</span>
                    <span>
                      ({node.status} - {node.shards} shards)
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <Spinner />
            )}
          </div>

          <div className="flex flex-col border-2 border-bg-verba shadow-sm p-4 rounded-lg">
            <div className="flex gap-2 items-center">
              <p className="text-text-alt-verba text-sm lg:text-base font-semibold">
                Collections
              </p>
              {collectionPayload ? (
                <p className="text-text-alt-verba text-sm lg:text-base font-semibold">
                  {collectionPayload.collection_count}
                </p>
              ) : (
                <Spinner />
              )}
            </div>

            {collectionPayload ? (
              <ul className="flex flex-col mt-2 list-disc list-inside">
                {collectionPayload.collections.map((collection) => (
                  <li
                    key={"Collection" + collection.name}
                    className="text-sm text-text-verba flex justify-between"
                  >
                    <span className="w-128 truncate">{collection.name}</span>
                    <span>{collection.count} objects</span>
                  </li>
                ))}
              </ul>
            ) : (
              <Spinner />
            )}
          </div>
        </div>
      </div>
      <div className="hidden" />
    </div>
  );
};

export default InfoView;
