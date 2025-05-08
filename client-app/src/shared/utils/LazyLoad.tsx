/* eslint-disable react-refresh/only-export-components */
import React, { ComponentType, lazy, Suspense } from "react";
import {
  Center,
  HStack,
  Skeleton,
  SkeletonCircle,
  Stack,
  Text,
  Spinner,
} from "@chakra-ui/react";

/**
 * Default loading component
 */
const DefaultLoadingFallback = () => (
  <Center h="100%" minH="200px" w="100%">
    <Spinner />
  </Center>
);

/**
 * Default error component
 */
const DefaultErrorFallback = () => (
  <Center h="100%" minH="200px" w="100%">
    <Stack align="center">
      <Text color="red.500">Failed to load component</Text>
      <Text fontSize="sm">Please try refreshing the page</Text>
    </Stack>
  </Center>
);

/**
 * Error boundary component for handling lazy loading errors
 */
class ErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode; fallback: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    console.error("Lazy loading error:", error);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

/**
 * Creates a lazily loaded component with error handling
 * @param importFunc - Dynamic import function that returns the component
 * @param options - Optional configuration
 * @returns A wrapped component that handles loading and error states
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function lazyLoad<T extends ComponentType<any>>(
  importFunc: () => Promise<{ default: T }>,
  options?: {
    loadingFallback?: React.ReactNode;
    errorFallback?: React.ReactNode;
  }
) {
  const LazyComponent = lazy(importFunc);

  return function LazyLoadWrapper(props: React.ComponentProps<T>) {
    const loadingElement = options?.loadingFallback || (
      <DefaultLoadingFallback />
    );
    const errorElement = options?.errorFallback || <DefaultErrorFallback />;

    return (
      <ErrorBoundary fallback={errorElement}>
        <Suspense fallback={loadingElement}>
          <LazyComponent {...props} />
        </Suspense>
      </ErrorBoundary>
    );
  };
}

export default lazyLoad;
