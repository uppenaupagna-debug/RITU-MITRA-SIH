import React from "react";
import { Card, CardContent } from "@/components/ui/card";

export default function CardShell({ children }) {
  return (
    <Card
      className="rounded-lg border border-neutral-200 dark:border-neutral-800 
                 bg-white dark:bg-neutral-900 
                 transition hover:bg-neutral-50 dark:hover:bg-neutral-800 
                 hover:border-neutral-300 dark:hover:border-neutral-700"
    >
      <CardContent className="p-4">{children}</CardContent>
    </Card>
  );
}
