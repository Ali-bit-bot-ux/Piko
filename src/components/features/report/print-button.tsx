"use client";

import { Button } from "@/components/ui";

/** Opens the browser print dialog; "Save as PDF" is one of its choices. */
export function PrintButton({ label }: { label: string }) {
  return (
    <Button variant="secondary" onClick={() => window.print()}>
      {label}
    </Button>
  );
}
