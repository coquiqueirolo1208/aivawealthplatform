"use client";

import { useFormStatus } from "react-dom";
import type { ComponentProps } from "react";

/**
 * Submit button that disables itself while its parent <form action={...}> is
 * running, so a double-click can't fire the server action twice (which used to
 * create duplicate clients/accounts/prospects). Must be rendered inside the form.
 */
export function SubmitButton({
  children,
  pendingText,
  disabled,
  ...props
}: ComponentProps<"button"> & { pendingText?: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending || disabled} aria-busy={pending} {...props}>
      {pending && pendingText ? pendingText : children}
    </button>
  );
}
