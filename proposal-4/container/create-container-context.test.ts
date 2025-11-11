import { vi } from 'vitest';
import createContainerContext from './create-container-context';
import Container from './service';
import BindingResolutionError from './binding-resolution-error';

describe('createContainerContext', () => {
  let containerInstance: any;

  beforeEach(() => {
    containerInstance = Container.getInstance();
    containerInstance.reset();
    vi.spyOn(containerInstance, 'has');
    vi.spyOn(containerInstance, 'get');
    vi.spyOn(containerInstance, 'bind');
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize the context with the default value if context does not exist', () => {
    const defaultValue = 'default';
    const key = 'testKey';
    containerInstance.has.mockReturnValue(false);

    const context = createContainerContext(defaultValue, key);

    expect(containerInstance.bind).toHaveBeenCalledWith(`context_${key}`, defaultValue);
    containerInstance.get.mockReturnValue(defaultValue);
    expect(context.getValue()).toBe(defaultValue);
    context.setValue('newValue');
    expect(containerInstance.bind).toHaveBeenCalledWith(`context_${key}`, 'newValue');
  });

  it('should return the existing context if context already exists', () => {
    const defaultValue = 'default';
    const key = 'testKey';
    const existingValue = 'existingValue';
    containerInstance.has.mockReturnValue(true);
    containerInstance.get.mockReturnValue(existingValue);

    const context = createContainerContext(defaultValue, key);

    expect(containerInstance.bind).not.toHaveBeenCalledWith(`context_${key}`, defaultValue);
    expect(context.getValue()).toBe(existingValue);
    context.setValue('newValue');
    expect(containerInstance.bind).toHaveBeenCalledWith(`context_${key}`, 'newValue');
  });

  it('should update the context value', () => {
    const defaultValue = 'default';
    const key = 'testKey';
    containerInstance.has.mockReturnValue(false);

    const context = createContainerContext(defaultValue, key);

    context.setValue('updatedValue');
    expect(containerInstance.bind).toHaveBeenCalledWith(`context_${key}`, 'updatedValue');
    containerInstance.get.mockReturnValue('updatedValue');
    expect(context.getValue()).toBe('updatedValue');
  });

  it('should throw an error if the key does not exist', () => {
    const key = 'nonExistentKey';
    containerInstance.has.mockReturnValue(false);
    containerInstance.get.mockImplementation(() => {
      throw new BindingResolutionError(`Could not find anything for key ${key}`);
    });

    expect(() => containerInstance.get(key)).toThrow(BindingResolutionError);
  });
});
