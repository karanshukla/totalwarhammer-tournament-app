/* eslint-disable react-refresh/only-export-components */
import React, { ComponentType, lazy, Suspense } from "react";
import { Center, Stack, Text, Spinner } from "@chakra-ui/react";

const DefaultLoadingFallback = () => (
  <Center h="100%" minH="200px" w="100%">
    <Spinner size="xl" role="status" aria-label="Loading page" />
  </Center>
);

const DefaultErrorFallback = () => (
  <Center h="100%" minH="200px" w="100%">
    <Stack align="center" role="alert">
      <Text color="status.loss">Failed to load component</Text>
      <Text fontSize="sm">Please try refreshing the page</Text>
    </Stack>
  </Center>
);

/** Catches errors thrown while the lazy chunk loads, so one failed dynamic import shows a fallback instead of blanking the app. */
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function lazyLoad<T extends ComponentType<any>>(
  importFunc: () => Promise<{ default: T }>,
  options?: {
    loadingFallback?: React.ReactNode;
    errorFallback?: React.ReactNode;
  },
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
