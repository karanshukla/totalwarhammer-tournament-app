import {
  Box,
  Heading,
  Text,
  VStack,
  Container,
  Input,
  Button,
  Stack,
  Field,
  Image,
} from '@chakra-ui/react';
import { Toaster, toaster } from "@/components/ui/toaster"
import { useForm } from 'react-hook-form';

interface FormValues {
  username: string
  email: string
  password: string
}

// @ts-ignore
const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';

function onSubmit(data: FormValues) {
  console.log(data);
  fetch(apiUrl + '/register', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  })
    .then((responseData) => {
      toaster.create({
        title: "Successfully Registered with the username " + data.username,
        description: "You will be notified when the app is ready",
        type: "success",
      })

    })
    .catch((error) => {
      console.error('Error during registration:', error);
      toaster.create({
        title: "Registration Failed",
        description: error.message || 'Registration failed for an unknown reason',
        type: "error",
      })
    });
}

export function App() {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>()

  return (
    <Box
      display="flex"
      alignItems="center"
      justifyContent="center"
    >
      <Container maxW="container.md" py={10}>
        <VStack gap={6} textAlign="center">
          <Image height="200px" src="/karzfranz.jpg" alt="Summon the Elector Counts" rounded="md" />
          <Heading size="2xl" mb={2}>
            Total Warhammer Tournament App
          </Heading>

          <Text fontSize="xl" >
            Currently under construction! Register below for updates.
          </Text>
          <form onSubmit={handleSubmit(onSubmit)}>
            <Stack gap="4" align="flex-start" maxW="sm">
            <Toaster />
              <Field.Root invalid={!!errors.username}>
                <Field.Label>Username</Field.Label>
                <Input {...register("username")} />
                <Field.ErrorText>{errors.username?.message}</Field.ErrorText>
              </Field.Root>

              <Field.Root invalid={!!errors.email}>
                <Field.Label>Email Address</Field.Label>
                <Input {...register("email")} />
                <Field.ErrorText>{errors.email?.message}</Field.ErrorText>
              </Field.Root>

              <Field.Root invalid={!!errors.password}>
                <Field.Label>Password (disabled)</Field.Label>
                <Input disabled {...register("password")} />
                <Field.ErrorText>{errors.password?.message}</Field.ErrorText>
              </Field.Root>

              <Button type="submit">Submit</Button>
            </Stack>
          </form>
        </VStack>
      </Container>
    </Box>
  );
}

export default App;
