/// <reference types="vite/client" />

// Standard Vue SFC shim; the loose generics are intentional here.
/* eslint-disable @typescript-eslint/no-empty-object-type, @typescript-eslint/no-explicit-any */
declare module '*.vue' {
  import type { DefineComponent } from 'vue';
  const component: DefineComponent<{}, {}, any>;
  export default component;
}
