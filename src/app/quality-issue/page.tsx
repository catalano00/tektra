// app/quality-issue/page.tsx

import { Suspense } from "react";
import QualityIssueClient from "./QualityIssueClient";

export default function Page() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <QualityIssueClient />
    </Suspense>
  );
}