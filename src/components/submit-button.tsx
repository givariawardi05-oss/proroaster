"use client"

import { Button, type ButtonProps } from "./ui/button";

type SubmitButtonProps = ButtonProps & {
  children: React.ReactNode;
  pendingText?: string;
};

export function SubmitButton({ children, pendingText, pending, ...props }: SubmitButtonProps) {
  return (
    <Button type="submit" {...props} disabled={pending}>
      {pending ? pendingText || children : children}
    </Button>
  );
}
