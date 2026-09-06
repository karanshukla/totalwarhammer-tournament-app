import React from "react";
import { Field, Text, Textarea } from "@chakra-ui/react";
import { TOURNAMENT_DESCRIPTION_MAX_LENGTH } from "@/shared/constants/validation";

interface TournamentDescriptionFieldProps {
  description: string;
  onChange: (description: string) => void;
}

/** Markdown description textarea with a live character counter. */
const TournamentDescriptionField: React.FC<TournamentDescriptionFieldProps> = ({
  description,
  onChange,
}) => (
  <Field.Root>
    <Field.Label>Description</Field.Label>
    <Textarea
      name="description"
      value={description}
      onChange={(e) => onChange(e.target.value)}
      placeholder="Enter tournament description (Markdown supported)"
      minH="200px"
      resize="vertical"
      maxLength={TOURNAMENT_DESCRIPTION_MAX_LENGTH}
    />
    <Field.HelperText>
      <Text as="span">Markdown supported. </Text>
      <Text
        as="span"
        color={
          description.length >= TOURNAMENT_DESCRIPTION_MAX_LENGTH
            ? "status.loss"
            : "fg.muted"
        }
      >
        {description.length}/{TOURNAMENT_DESCRIPTION_MAX_LENGTH}
      </Text>
    </Field.HelperText>
  </Field.Root>
);

export default TournamentDescriptionField;
