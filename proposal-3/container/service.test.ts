import { vi } from 'vitest';
import Container from './service';
import BindingResolutionError from './binding-resolution-error';

describe('The Service Container', () => {
  it('Stores and retrieves a service', () => {
    const container = Container.getInstance();
    const mockService = vi.fn();
    container.bind('mockService', mockService);
    expect(container.get('mockService')).toBe(mockService);
  });

  it('Stores and retrieves a value', () => {
    const container = Container.getInstance();
    const mockValue = 'test-value';
    container.bind('test-key', mockValue);
    expect(container.get('test-key')).toEqual(mockValue);
  });

  it('Resets the container when instructed to do so', () => {
    const container = Container.getInstance();
    container.bind('key-1', 'value-1');
    container.reset();

    const t = () => {
      container.get('key-1');
    };

    expect(t).toThrow(BindingResolutionError);
  });
});
