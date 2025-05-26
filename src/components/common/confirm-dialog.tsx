import React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  children?: React.ReactNode;
}

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  onConfirm,
  onCancel,
  children,
}) => {
  const dialogCoreContent = (
    <DialogContent className="sm:max-w-[425px]">
      <DialogHeader>
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription>{description}</DialogDescription>
      </DialogHeader>
      <DialogFooter>
        <Button variant="secondary" onClick={onCancel}>
          {cancelLabel}
        </Button>
        <Button variant="destructive" onClick={onConfirm}>
          {confirmLabel}
        </Button>
      </DialogFooter>
    </DialogContent>
  );

  if (children) {
    return (
      <Dialog open={isOpen} onOpenChange={onCancel} modal={false}>
        <DialogTrigger asChild>{children}</DialogTrigger>
        {dialogCoreContent}
      </Dialog>
    );
  } else {
    return (
      <Dialog open={isOpen} onOpenChange={onCancel} modal={false}>
        {/* Render DialogContent directly when isOpen is true and no children trigger */}
        {isOpen && dialogCoreContent}
      </Dialog>
    );
  }
};

export default ConfirmDialog;
