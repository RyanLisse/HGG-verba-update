"use client";
import React, { useState, useEffect } from "react";
import {
  DocumentPreview,
  Credentials,
  DocumentsPreviewPayload,
} from "@/app/types";
import { deleteDocument } from "@/app/api";
import { FaSearch, FaTrash } from "react-icons/fa";
import { MdOutlineRefresh, MdCancel } from "react-icons/md";
import { FaArrowAltCircleLeft, FaArrowAltCircleRight } from "react-icons/fa";
import InfoComponent from "../Navigation/InfoComponent";
import UserModalComponent from "../Navigation/UserModal";
import VerbaButton from "../Navigation/VerbaButton";
import { IoMdAddCircle } from "react-icons/io";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/app/components/ui/dropdown-menu";
import { Input } from "@/app/components/ui/input";
import { Spinner } from "@/app/components/ui/spinner";
import { useDocumentsQuery, useDeleteDocumentMutation } from "@/app/lib/queries";

interface DocumentSearchComponentProps {
  selectedDocument: string | null;
  credentials: Credentials;
  setSelectedDocument: (c: string | null) => void;
  production: "Local" | "Demo" | "Production";
  addStatusMessage: (
    message: string,
    type: "INFO" | "WARNING" | "SUCCESS" | "ERROR"
  ) => void;
}

const DocumentSearch: React.FC<DocumentSearchComponentProps> = ({
  selectedDocument,
  setSelectedDocument,
  production,
  addStatusMessage,
  credentials,
}) => {
  const [userInput, setUserInput] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState("");
  const [page, setPage] = useState(1);

  const pageSize = 50;

  const [selectedLabels, setSelectedLabels] = useState<string[]>([]);

  // Query: documents + labels
  const { data, isFetching } = useDocumentsQuery(
    credentials,
    submittedQuery,
    selectedLabels,
    page,
    pageSize
  );
  const documents = data?.documents ?? [];
  const labels = data?.labels ?? [];
  const totalDocuments = data?.totalDocuments ?? 0;

  // Delete mutation
  const deleteMutation = useDeleteDocumentMutation(credentials);

  const nextPage = () => {
    if (!documents) {
      return;
    }

    if (page * pageSize < totalDocuments) {
      setPage((prev) => prev + 1);
    } else {
      setPage(1);
    }
  };

  const previousPage = () => {
    if (!documents) {
      return;
    }
    if (page == 1) {
      setPage(Math.ceil(totalDocuments / pageSize));
    } else {
      setPage((prev) => prev - 1);
    }
  };

  const handleSearch = () => {
    setSubmittedQuery(userInput);
  };

  const clearSearch = () => {
    setUserInput("");
    setSelectedLabels([]);
    setSubmittedQuery("");
    setPage(1);
  };

  const handleKeyDown = (e: any) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault(); // Prevent new line
      handleSearch(); // Submit form
    }
  };

  const handleDeleteDocument = async (d: string) => {
    if (production == "Demo") {
      return;
    }
    const response = await deleteMutation.mutateAsync(d);
    addStatusMessage("Deleted document", "WARNING");
    if (response) {
      if (d == selectedDocument) {
        setSelectedDocument(null);
      }
      // invalidation handled in mutation
    }
  };

  const addLabel = (l: string) => {
    setSelectedLabels((prev) => [...prev, l]);
  };

  const removeLabel = (l: string) => {
    setSelectedLabels((prev) => prev.filter((label) => label !== l));
  };

  const openDeleteModal = (id: string) => {
    const modal = document.getElementById(id);
    if (modal instanceof HTMLDialogElement) {
      modal.showModal();
    }
  };

  return (
    <div className="flex flex-col gap-2 w-full">
      {/* Search Header */}
      <div className="bg-bg-alt-verba rounded-2xl flex gap-2 p-3 items-center justify-between h-min w-full">
        <div className="hidden lg:flex gap-2 justify-start w-[8vw]">
          <InfoComponent
            tooltip_text="Search and inspect different documents imported into Verba"
            display_text="Search"
          />
        </div>

        <Input
          className="w-full bg-bg-verba"
          onKeyDown={handleKeyDown}
          placeholder={`Search for documents (${totalDocuments})`}
          value={userInput}
          onChange={(e) => {
            setUserInput(e.target.value);
          }}
        />

        <VerbaButton onClick={handleSearch} Icon={FaSearch} />
        <VerbaButton
          onClick={clearSearch}
          icon_size={20}
          Icon={MdOutlineRefresh}
        />
      </div>

      {/* Document List */}
      <div className="bg-bg-alt-verba rounded-2xl flex flex-col p-6 gap-3 items-center h-full w-full overflow-auto">
        <div className="flex flex-col w-full justify-start gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <div>
                <VerbaButton
                  title="Label"
                  className="btn-sm min-w-min"
                  icon_size={12}
                  text_class_name="text-xs"
                  Icon={IoMdAddCircle}
                  selected={false}
                  disabled={false}
                />
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-52">
              {labels.map((label, index) => (
                <DropdownMenuItem
                  key={"Label" + index}
                  onClick={() => {
                    if (!selectedLabels.includes(label)) {
                      setSelectedLabels([...selectedLabels, label]);
                    }
                  }}
                >
                  {label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <div className="flex flex-wrap gap-2">
            {selectedLabels.map((label, index) => (
              <VerbaButton
                title={label}
                key={"FilterDocumentLabel" + index}
                Icon={MdCancel}
                className="btn-sm min-w-min max-w-[200px]"
                icon_size={12}
                selected_color="bg-primary-verba"
                selected={true}
                text_class_name="truncate max-w-[200px]"
                text_size="text-xs"
                onClick={() => {
                  removeLabel(label);
                }}
              />
            ))}
          </div>
        </div>

        {isFetching && (
          <div className="flex items-center justify-center gap-2">
            <span className="text-text-alt-verba">
              <Spinner />
            </span>
          </div>
        )}

        <div className="flex flex-col w-full">
          {documents &&
            documents.map((document, index) => (
              <div
                key={"Document" + index + document.title}
                className="flex justify-between items-center gap-2 rounded-2xl p-1 w-full"
              >
                <div className="flex justify-between items-center w-full gap-2">
                  <VerbaButton
                    title={document.title}
                    selected={selectedDocument == document.uuid}
                    selected_color="bg-secondary-verba"
                    key={document.title + index}
                    className="flex-grow"
                    text_class_name="truncate max-w-[150px] lg:max-w-[350px]"
                    onClick={() => setSelectedDocument(document.uuid)}
                  />
                  {production !== "Demo" && (
                    <VerbaButton
                      Icon={FaTrash}
                      selected={selectedDocument == document.uuid}
                      selected_color="bg-warning-verba"
                      className="max-w-min"
                      key={document.title + index + "delete"}
                      onClick={() => {
                        openDeleteModal("remove_document" + document.uuid);
                      }}
                    />
                  )}
                </div>
                <UserModalComponent
                  modal_id={"remove_document" + document.uuid}
                  title={"Remove Document"}
                  text={"Do you want to remove " + document.title + "?"}
                  triggerString="Delete"
                  triggerValue={document.uuid}
                  triggerAccept={handleDeleteDocument}
                />
              </div>
            ))}{" "}
        </div>
      </div>

      <div className="bg-bg-alt-verba rounded-2xl flex gap-2 p-4 items-center justify-center h-min w-full">
        <div className="join justify-center items-center text-text-verba">
          <div className="flex justify-center items-center gap-2 bg-bg-alt-verba">
            <VerbaButton
              title={"Previous Page"}
              onClick={previousPage}
              className="btn-sm min-w-min max-w-[200px]"
              text_class_name="text-xs"
              Icon={FaArrowAltCircleLeft}
            />
            <div className="flex items-center">
              <p className="text-xs text-text-verba">Page {page}</p>
            </div>
            <VerbaButton
              title={"Next Page"}
              onClick={nextPage}
              className="btn-sm min-w-min max-w-[200px]"
              text_class_name="text-xs"
              Icon={FaArrowAltCircleRight}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default DocumentSearch;
