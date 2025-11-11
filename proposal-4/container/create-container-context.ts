import { Context } from './types';
import Container from './service';

const createContainerContext = <T>(defaultValue: T, key: string): Context<T> => {
  const contextKey = `context_${key}`;

  if (Container.getInstance().has(contextKey)) {
    // If the context already exists, return the existing context
    return {
      getValue: (): T => Container.getInstance().get(contextKey),
      setValue: (value: T): void => { Container.getInstance().bind(contextKey, value); },
    };
  }

  const context: Context<T> = {
    getValue: (): T => Container.getInstance().get(contextKey),
    setValue: (value: T): void => { Container.getInstance().bind(contextKey, value); },
  };

  // Initialize the context with the default value
  Container.getInstance().bind(contextKey, defaultValue);

  return context;
};

export default createContainerContext;
