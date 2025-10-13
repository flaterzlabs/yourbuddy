import '@testing-library/jest-dom';

// Polyfills e mocks leves para ambiente de testes
class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}
// @ts-ignore
global.ResizeObserver = global.ResizeObserver || ResizeObserverMock;

