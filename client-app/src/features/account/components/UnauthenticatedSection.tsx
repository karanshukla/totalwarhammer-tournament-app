import React from "react";
import { CardRoot, Text } from "@chakra-ui/react";

const UnauthenticatedSection: React.FC = () => {
  return (
    <CardRoot p={5} borderWidth="1px" borderRadius="lg" width="50%">
      <Text>You aren't logged in! :(</Text>
    </CardRoot>
  );
};

export default UnauthenticatedSection;
