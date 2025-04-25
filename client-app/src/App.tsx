import {
  Box,
  Heading,
  Text,
  VStack,
  Icon,
  Container,
  Input,
  HStack,
  Button,
  Stack,
  Field,
} from '@chakra-ui/react';
import { FaHammer, FaGithub, FaDiscord } from 'react-icons/fa';
import { useForm } from 'react-hook-form';

interface FormValues {
  username: string
  email: string
  password: string
}

function onSubmit(data: FormValues) {
  console.log(data);
  fetch('http://localhost:3000/api/register', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  })
    .then((response) => {
      if (!response.ok) {
        throw new Error('Registration failed');
      }
      return response.json();
    })
    .then((responseData) => {
      console.log('Registration successful:', responseData);
    })
    .catch((error) => {
      console.error('Error during registration:', error);
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
            <Icon as={FaHammer} w={20} h={20} color="orange.400" />
            
            <Heading size="2xl" mb={2}>
              Total Warhammer Tournament App
            </Heading>
            
            <Text fontSize="xl" >
              Currently under construction!
            </Text>
            <form onSubmit={handleSubmit(onSubmit)}>
      <Stack gap="4" align="flex-start" maxW="sm">

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
          <Field.Label>Password</Field.Label>
          <Input disabled={true} {...register("password")} />
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
