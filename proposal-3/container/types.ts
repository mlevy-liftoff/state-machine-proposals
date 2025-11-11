export interface Context<T> {
  getValue: () => T;
  setValue: (value: T) => void;
}
