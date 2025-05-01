import React, { ComponentType, lazy, Suspense } from "react";
import { Center, Spinner, Stack, Text } from "@chakra-ui/react";

interface LazyLoadedComponentProps {
  fallback?: React.ReactNode;
}

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
 * Default loading component
 */
const DefaultLoadingFallback = () => (
  <Center h="100%" minH="200px" w="100%">
    <Spinner size="xl" />
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
 * Creates a lazily loaded component with error boundary and loading state
 * @param importFunc Dynamic import function
 * @returns Wrapped component with suspense and error handling
 */
export function lazyLoad<T extends ComponentType<any>>(
  importFunc: () => Promise<{ default: T }>,
  loadingFallback?: React.ReactNode,
  errorFallback?: React.ReactNode
) {
  const LazyComponent = lazy(importFunc);

  const LoadingFallback = loadingFallback || <DefaultLoadingFallback />;
  const ErrorFallback = errorFallback || <DefaultErrorFallback />;

  return function WithLazyLoading(
    props: React.ComponentProps<T> & LazyLoadedComponentProps
  ) {
    const { fallback = LoadingFallback, ...componentProps } = props;

    return (
      <ErrorBoundary fallback={ErrorFallback}>
        <Suspense fallback={fallback}>
          <LazyComponent {...(componentProps as any)} />
        </Suspense>
      </ErrorBoundary>
    );
  };
}

export default lazyLoad;
