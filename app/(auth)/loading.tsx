import React from "react";
import { PageLoader } from "@/components/loading/PageLoader";

export default function AuthLoading(): React.JSX.Element {
  return <PageLoader label="Preparing secure access" />;
}
