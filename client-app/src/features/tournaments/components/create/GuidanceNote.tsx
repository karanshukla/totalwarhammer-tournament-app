import React from "react";
import Callout from "@/shared/ui/Callout";

interface GuidanceNoteProps {
  tone: "warning" | "info";
  children: React.ReactNode;
}

const GuidanceNote: React.FC<GuidanceNoteProps> = ({ tone, children }) => (
  <Callout tone={tone} icon fontSize="xs">
    {children}
  </Callout>
);

export default GuidanceNote;
