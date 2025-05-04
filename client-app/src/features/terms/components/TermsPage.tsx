import React from "react";
import { Heading, Container, Stack } from "@chakra-ui/react";
import { Prose } from "@/shared/ui/prose";

const TermsPage: React.FC = () => {
  return (
    <Container maxW="container.xl" py={8}>
      <Stack>
        <Heading as="h1" size="xl">
          Terms of Use
        </Heading>
        <Prose size="lg">
          <h2>Some things I have to tell you</h2>
          <p>
            You're free to use this app for generating brackets and hosting
            tournaments. You can use it for any game, but future development may
            be specific to Total War: Warhammer.
            <br />
            <br />
            Data is stored in the EU and is subject to GDPR. However, the static
            frontend may be served from multiple locations based off the hosting
            provider's CDN (Content Delivery Network) settings.
            <br />
            <br />
            Obviously, you can't use this app for any illegal activities or
            anything that would violate the terms of service of the game.
            <br />
            <br />
            Total War is a registered trademark of SEGA and Creative Assembly.
            This project is not affiliated with nor endorsed by SEGA or Creative
            Assembly.
            <br />
            <br />
            In general, don't be mean to others, and don't do anything Karl
            Franz would disapprove of.
            <br />
            <br />
            If you have any questions or feedback, please open an issue on
            Github or contact me on Discord: @anchorstandard
          </p>
        </Prose>
      </Stack>
    </Container>
  );
};

export default TermsPage;
