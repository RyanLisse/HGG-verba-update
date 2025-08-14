"use client";

import React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/app/components/ui/dialog";
import { Button } from "@/app/components/ui/button";

interface UserModalComponentProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  text: string;
  triggerAccept?: null | ((a: any) => void);
  triggerValue?: any | null;
  triggerString?: string | null;
}

const UserModalComponent: React.FC<UserModalComponentProps> = ({
  open,
  onOpenChange,
  title,
  text,
  triggerAccept,
  triggerString,
  triggerValue,
}) => {
  const handleAccept = () => {
    if (triggerAccept) {
      triggerAccept(triggerValue);
    }
    onOpenChange(false);
  };

  const handleCancel = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription className="whitespace-pre-wrap">
            {text}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex gap-2">
          {triggerAccept && triggerString && (
            <Button onClick={handleAccept} variant="default">
              {triggerString}
            </Button>
          )}
          <Button onClick={handleCancel} variant="destructive">
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default UserModalComponent;