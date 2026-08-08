import React from "react";
import ReactMarkdown from "react-markdown";
import { Box } from "@chakra-ui/react";

const markdownStyles = {
  "& h1,& h2,& h3,& h4,& h5,& h6": {
    fontWeight: "bold",
    lineHeight: 1.3,
    marginTop: "0.75rem",
    marginBottom: "0.25rem",
  },
  "& h1": { fontSize: "1.25rem" },
  "& h2": { fontSize: "1.125rem" },
  "& h3": { fontSize: "1rem" },
  "& p": { marginBottom: "0.5rem", lineHeight: 1.6 },
  "& ul,& ol": { paddingLeft: "1.25rem", marginBottom: "0.5rem" },
  "& li": { marginBottom: "0.25rem" },
  "& strong": { fontWeight: "bold" },
  "& em": { fontStyle: "italic" },
  "& code": {
    fontFamily: "monospace",
    background: "var(--chakra-colors-bg-muted)",
    padding: "0 4px",
    borderRadius: "3px",
    fontSize: "0.8em",
  },
  "& pre": {
    background: "var(--chakra-colors-bg-muted)",
    padding: "0.75rem",
    borderRadius: "6px",
    overflowX: "auto",
    marginBottom: "0.5rem",
    fontSize: "0.8em",
  },
  "& blockquote": {
    borderLeft: "3px solid var(--chakra-colors-border)",
    paddingLeft: "0.75rem",
    color: "var(--chakra-colors-fg-muted)",
    margin: "0.5rem 0",
  },
  "& a": {
    color: "var(--chakra-colors-verdigris-fg)",
    textDecoration: "underline",
  },
  "& hr": {
    borderColor: "var(--chakra-colors-border)",
    margin: "0.75rem 0",
  },
  "& img": { maxWidth: "100%", height: "auto", borderRadius: "4px" },
};

interface MarkdownContentProps {
  children: string;
  color?: string;
  w?: string;
  mt?: number;
}

const MarkdownContent: React.FC<MarkdownContentProps> = ({
  children,
  color = "fg",
  ...boxProps
}) => (
  <Box fontSize="sm" color={color} css={markdownStyles} {...boxProps}>
    <ReactMarkdown>{children}</ReactMarkdown>
  </Box>
);

export default MarkdownContent;
