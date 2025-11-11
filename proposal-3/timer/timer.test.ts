import { vi } from 'vitest';
import Timer from './timer';
import createMockTimerService from '../../../tests/unit/helpers/create-mock-timer-service';

describe('Timer', () => {
  let setTimeoutSpy: any;

  beforeEach(() => {
    vi.useFakeTimers();
    setTimeoutSpy = vi.spyOn(global, 'setTimeout');
  });

  afterEach(() => {
    vi.useRealTimers();
    setTimeoutSpy.mockRestore();
  });

  it('should start the timer and execute callable after the delay', () => {
    const callable = vi.fn();
    const mockTimerService = createMockTimerService();
    const timer = new Timer(1000, mockTimerService, callable);
    timer.start();

    expect(setTimeoutSpy).toHaveBeenCalledTimes(1);
    expect(setTimeoutSpy).toHaveBeenLastCalledWith(expect.any(Function), 1000);

    vi.advanceTimersByTime(1000);
    expect(callable).toHaveBeenCalledTimes(1);
  });

  it('should pause the timer and resume it', () => {
    const callable = vi.fn();
    const mockTimerService = createMockTimerService();
    const timer = new Timer(1000, mockTimerService, callable);
    timer.start();
    timer.pause();
    timer.start(); // You can only advance timers for a running timer

    vi.advanceTimersByTime(500);
    expect(callable).toHaveBeenCalledTimes(0);

    timer.start();
    vi.advanceTimersByTime(500);
    expect(callable).toHaveBeenCalledTimes(1);
  });

  it('should destroy the timer', () => {
    const callable = vi.fn();
    const mockTimerService = createMockTimerService();
    const timer = new Timer(1000, mockTimerService, callable);
    timer.start();
    timer.destroy();

    vi.advanceTimersByTime(1000);
    expect(callable).toHaveBeenCalledTimes(0);
  });

  it('should resolve the promise when the timer finishes', async () => {
    const mockTimerService = createMockTimerService();
    const timer = new Timer(1000, mockTimerService);
    const promise = timer.asPromise();

    vi.advanceTimersByTime(1000);
    await expect(promise).resolves.toBeUndefined();
  });

  it('should reject the promise when the timer is destroyed', async () => {
    const mockTimerService = createMockTimerService();
    const timer = new Timer(1000, mockTimerService);
    const promise = timer.asPromise();
    timer.destroy();

    await expect(promise).rejects.toBe(false);
  });

  it('should resolve the promise when the timer is paused and resumed', async () => {
    const mockTimerService = createMockTimerService();
    const timer = new Timer(1000, mockTimerService);
    const promise = timer.asPromise();
    timer.start();

    timer.pause();
    timer.start();
    vi.advanceTimersByTime(500);
    timer.pause();

    timer.start();
    vi.advanceTimersByTime(500);

    await expect(promise).resolves.toBeUndefined();
  });

  it('should not start the timer if it is already running', () => {
    const mockTimerService = createMockTimerService();
    const callable = vi.fn();
    const timer = new Timer(1000, mockTimerService, callable);

    timer.start();
    timer.start();

    vi.advanceTimersByTime(1000);
    expect(callable).toHaveBeenCalledTimes(1);
  });

  it('should not execute callable if it is not defined', () => {
    const mockTimerService = createMockTimerService();
    const timer = new Timer(1000, mockTimerService);
    timer.start();

    expect(setTimeoutSpy).toHaveBeenCalledTimes(1);
    expect(setTimeoutSpy).toHaveBeenLastCalledWith(expect.any(Function), 1000);

    vi.advanceTimersByTime(1000);
  });

  it('should return false if trying to start a destroyed timer', () => {
    const mockTimerService = createMockTimerService();
    const timer = new Timer(1000, mockTimerService);
    timer.destroy();

    expect(timer.start()).toBe(false);
  });

  it('should not start the timer if the timer service is paused', () => {
    const callable = vi.fn();
    const mockTimerService = createMockTimerService();
    const timer = new Timer(1000, mockTimerService, callable);
    mockTimerService.pauseAll(); // Simulate paused state
    timer.start();

    expect(setTimeoutSpy).not.toHaveBeenCalled();
    expect(callable).not.toHaveBeenCalled();
  });
});
