"use client"

import { useFormStatus } from "react-dom";
import { Button, type ButtonProps } from "./ui/button";

type SubmitButtonProps = ButtonProps & {
  children: React.ReactNode;
  pendingText?: string;
};

export function SubmitButton({ children, pendingText, ...props }: SubmitButtonProps) {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" {...props} pending={pending} disabled={pending}>
      {pending ? pendingText || children : children}
    </Button>
  );
}
