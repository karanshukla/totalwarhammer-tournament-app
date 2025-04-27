/// <reference types="vite/client" />

interface ImportMeta {
  readonly env: {
    readonly VITE_API_URL: string;
    readonly VITE_JWT_SECRET: string;
    readonly [key: string]: string;
  };
}