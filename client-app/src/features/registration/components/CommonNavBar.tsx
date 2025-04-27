import React, { useEffect, useState } from 'react';
import { Box, VStack, HStack, useMediaQuery } from '@chakra-ui/react';
import { ColorModeButton, useColorModeValue } from '@/shared/ui/color-mode';

const CommonNavBar: React.FC = () => {
  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');
  const [isPortrait, setIsPortrait] = useState(false);
  const [isPortraitQuery] = useMediaQuery(["(orientation: portrait) and (max-width: 768px)"]);
  
  useEffect(() => {
    setIsPortrait(isPortraitQuery);
  }, [isPortraitQuery]);

  return (
    <Box 
      as="nav"
      bg={bgColor}
      position="fixed"
      boxShadow="sm"
      zIndex={10}
      {...(isPortrait ? {
        bottom: 0,
        left: 0,
        right: 0,
        width: "100%",
        height: "70px",
        borderTopWidth: "1px",
        borderColor: borderColor,
        py: 2,
        px: 3,
        overflowX: "auto",
        scrollBehavior: "smooth"
      } : {
        left: 0,
        top: 0,
        h: "100vh",
        w: { base: "70px", md: "250px" },
        borderRightWidth: "1px",
        borderColor: borderColor,
        py: 6,
        px: { base: 2, md: 4 },
      })}
      _hover={{
        boxShadow: "md"
      }}
    >
      {isPortrait ? (
        <HStack gap={6} justify="space-around" h="100%">
          {/* Navigation items would go here */}
        </HStack>
      ) : (
        <VStack gap={6} align="stretch">
          {/* Navigation items would go here */}
        </VStack>
      )}
    </Box>
  );
};

export default CommonNavBar;