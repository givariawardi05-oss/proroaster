"use client"

import { Loader2 } from "lucide-react";
import { Button, type ButtonProps } from "./ui/button";
import { cn } from "@/lib/utils";

type SubmitButtonProps = ButtonProps & {
  children: React.ReactNode;
  pendingText?: string;
};

export function SubmitButton({ children, pendingText, pending, className, ...props }: SubmitButtonProps) {
  return (
    <Button type="submit" {...props} disabled={pending}>
       {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      {pending ? pendingText || children : children}
    </Button>
  );
}
