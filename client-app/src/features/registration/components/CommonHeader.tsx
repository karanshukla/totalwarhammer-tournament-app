import React from 'react';
import { Box, Flex, Heading, Spacer } from '@chakra-ui/react';
import { ColorModeButton, useColorModeValue } from '@/shared/ui/color-mode';

interface CommonHeaderProps {
  title?: string;
}

const CommonHeader: React.FC<CommonHeaderProps> = ({ title = "Total War: Warhammer Tournament" }) => {
  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');
  const textColor = useColorModeValue('gray.800', 'white');

  return (
    <Box 
      as="header" 
      bg={bgColor} 
      borderBottomWidth="1px" 
      borderColor={borderColor}
      position="sticky"
      top="0"
      zIndex="sticky"
      w="100%"
      boxShadow="sm"
      py={3}
      px={{ base: 4, md: 6 }}
      _focusWithin={{
        boxShadow: "md"
      }}
    >
      <Flex 
        align="center" 
        maxW="container.xl" 
        mx="auto"
        h="100%"
      >
        <Heading 
          as="h1" 
          fontSize={{ base: "sm", md: "md" }}
          color={textColor}
        >
          {title}
        </Heading>
        <Spacer />
        <ColorModeButton />
      </Flex>
    </Box>
  );
};

export default CommonHeader;