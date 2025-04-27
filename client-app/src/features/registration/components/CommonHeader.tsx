import React from 'react';
import { Box, Flex, Spacer  } from '@chakra-ui/react';
import { ColorModeButton, useColorModeValue } from '@/shared/ui/color-mode';

interface CommonHeaderProps {
  title?: string;
}

const CommonHeader: React.FC<CommonHeaderProps> = ({ title = "Total War: Warhammer Tournament" }) => {
  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');

  return (
    <Box 
      as="header" 
      bg={bgColor} 
      borderBottom="1px" 
      borderBottomColor={borderColor}
      position="sticky"
      top="0"
      zIndex="sticky"
      width="100%"
      boxShadow="sm"
      py={4}
      px={6}
    >
      <Flex align="center" maxW="container.xl" mx="auto">
        <Spacer />
      <ColorModeButton />
      </Flex>
    </Box>
  );
};

export default CommonHeader;