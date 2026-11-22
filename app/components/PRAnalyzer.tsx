"use client";

import { useState } from "react";
import { usePRReport } from "./_lib/use-pr-report";
import { PRForm } from "./PRForm";
import { PRResults } from "./PRResults";

export function PRAnalyzer() {
  const [url, setUrl] = useState("");
  const { report, loading, error, analyze } = usePRReport();

  return (
    <>
      <div className="mx-auto mt-12 max-w-3xl">
        <PRForm url={url} setUrl={setUrl} loading={loading} error={error} onAnalyze={analyze} />
      </div>
      <PRResults report={report} loading={loading} />
    </>
  );
}
