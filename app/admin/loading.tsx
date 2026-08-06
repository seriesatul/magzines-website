import React from "react";
import { PageLoader } from "@/components/loading/PageLoader";

export default function AdminLoading(): React.JSX.Element {
  return <PageLoader label="Preparing the operations console" />;
}
