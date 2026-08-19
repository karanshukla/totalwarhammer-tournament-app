import React, { useEffect, useState } from "react";
import { Button, HStack, Text, Textarea, VStack } from "@chakra-ui/react";
import { LuCheck, LuFilePen } from "react-icons/lu";
import MarkdownContent from "@/shared/ui/MarkdownContent";
import { TOURNAMENT_DESCRIPTION_MAX_LENGTH } from "@/shared/constants/validation";

interface DescriptionEditorProps {
  description: string;
  editable: boolean;
  onSave: (draft: string) => Promise<void>;
}

/** Inline markdown description with an edit mode for the organiser. */
const DescriptionEditor: React.FC<DescriptionEditorProps> = ({
  description,
  editable,
  onSave,
}) => {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);

  // Esc cancels the inline editor (issue #144). Scoped to when the editor is
  // open and not mid-save, so it never fires elsewhere on the page.
  useEffect(() => {
    if (!editing || saving) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setEditing(false);
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [editing, saving]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(draft);
      setEditing(false);
    } catch {
      // The parent handler already surfaced this via a toast; swallowing here
      // keeps it off window.onunhandledrejection.
    } finally {
      setSaving(false);
    }
  };

  if (editable && editing) {
    const atLimit = draft.length >= TOURNAMENT_DESCRIPTION_MAX_LENGTH;
    return (
      <VStack mt={2} gap={2} alignItems="stretch" w="full">
        <Textarea
          value={draft}
          onChange={(e) =>
            setDraft(e.target.value.slice(0, TOURNAMENT_DESCRIPTION_MAX_LENGTH))
          }
          placeholder="Tournament description (Markdown supported)"
          minH="240px"
          h="240px"
          resize="vertical"
          fontSize="sm"
          maxLength={TOURNAMENT_DESCRIPTION_MAX_LENGTH}
        />
        <Text
          fontSize="xs"
          color={atLimit ? "status.loss" : "fg.muted"}
          textAlign="right"
        >
          {draft.length}/{TOURNAMENT_DESCRIPTION_MAX_LENGTH}
        </Text>
        <HStack gap={2}>
          <Button
            size="xs"
            colorPalette="crimson"
            onClick={handleSave}
            loading={saving}
          >
            <LuCheck />
            Save
          </Button>
          <Button size="xs" variant="ghost" onClick={() => setEditing(false)}>
            Cancel
          </Button>
        </HStack>
      </VStack>
    );
  }

  return (
    <VStack mt={1} gap={2} alignItems="flex-start">
      {description ? (
        <MarkdownContent w="full" color="fg.muted">
          {description}
        </MarkdownContent>
      ) : editable ? (
        <Text color="fg.muted" fontSize="sm" fontStyle="italic">
          No description - click Edit Description to add one.
        </Text>
      ) : null}
      {editable && (
        <Button
          size="sm"
          variant="outline"
          alignSelf="flex-start"
          onClick={() => {
            setDraft(description ?? "");
            setEditing(true);
          }}
        >
          <LuFilePen />
          Edit Description
        </Button>
      )}
    </VStack>
  );
};

export default DescriptionEditor;
