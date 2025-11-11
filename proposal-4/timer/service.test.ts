import { vi } from 'vitest';
import TimerService from './service';
import Timer from './timer';

describe('TimerService', () => {
  let timerService: TimerService;

  beforeEach(() => {
    timerService = new TimerService();
  });

  describe('getNewTimer', () => {
    it('should create a new timer and add it to the list of timers', () => {
      const delay = 1000;
      const callable = vi.fn();
      const newTimer = timerService.getNewTimer(delay, callable);

      expect(newTimer).toBeInstanceOf(Timer);

      const timers = Reflect.get(timerService, 'timers');
      expect(timers).toContain(newTimer);
    });
  });

  describe('pauseAll', () => {
    it('should pause all timers', () => {
      const mockTimer1 = { pause: vi.fn() };
      const mockTimer2 = { pause: vi.fn() };
      Reflect.set(timerService, 'timers', [mockTimer1, mockTimer2]);

      timerService.pauseAll();

      expect(mockTimer1.pause).toHaveBeenCalledTimes(1);
      expect(mockTimer2.pause).toHaveBeenCalledTimes(1);
    });

    it('should set paused state to true', () => {
      timerService.pauseAll();
      expect(timerService.isPaused()).toBe(true);
    });

    it('should pause any new timers created after pausing', () => {
      const delay = 1000;
      const callable = vi.fn();

      // pause the service
      timerService.pauseAll();

      // create a new timer that should not start
      const newTimer = timerService.getNewTimer(delay, callable);

      newTimer.start(); // This should not start the timer since the service is paused
      expect(newTimer.getId()).toBeUndefined(); // The timer should not have started
    });
  });

  describe('startAll', () => {
    it('should start all timers', () => {
      const mockTimer1 = { start: vi.fn() };
      const mockTimer2 = { start: vi.fn() };
      Reflect.set(timerService, 'timers', [mockTimer1, mockTimer2]);

      timerService.startAll();

      expect(mockTimer1.start).toHaveBeenCalledTimes(1);
      expect(mockTimer2.start).toHaveBeenCalledTimes(1);
    });
  });

  describe('standby', () => {
    it('should pause and stash all timers with an ID', () => {
      const mockTimer1 = { getId: () => 1, pause: vi.fn() };
      const mockTimer2 = { getId: () => undefined, pause: vi.fn() };
      Reflect.set(timerService, 'timers', [mockTimer1, mockTimer2]);

      timerService.standby();

      expect(mockTimer1.pause).toHaveBeenCalledTimes(1);
      expect(mockTimer2.pause).toHaveBeenCalledTimes(0);

      const stash = Reflect.get(timerService, 'stash');
      expect(stash).toContain(mockTimer1);
      expect(stash).not.toContain(mockTimer2);
    });

    it('should not stash timers if stash is not empty', () => {
      const mockTimer1 = { getId: () => 1, pause: vi.fn() };
      const mockTimer2 = { getId: () => 2, pause: vi.fn() };
      Reflect.set(timerService, 'timers', [mockTimer1, mockTimer2]);
      Reflect.set(timerService, 'stash', [mockTimer1]);

      timerService.standby();

      expect(mockTimer1.pause).toHaveBeenCalledTimes(0);
      expect(mockTimer2.pause).toHaveBeenCalledTimes(0);

      const stash = Reflect.get(timerService, 'stash');
      expect(stash).toContain(mockTimer1);
      expect(stash).not.toContain(mockTimer2);
    });
  });

  describe('wake', () => {
    it('should start all stashed timers and clear the stash', () => {
      const mockTimer1 = { start: vi.fn() };
      const mockTimer2 = { start: vi.fn() };
      Reflect.set(timerService, 'stash', [mockTimer1, mockTimer2]);

      timerService.wake();

      expect(mockTimer1.start).toHaveBeenCalledTimes(1);
      expect(mockTimer2.start).toHaveBeenCalledTimes(1);

      const stash = Reflect.get(timerService, 'stash');
      expect(stash.length).toBe(0);
    });
  });

  describe('destroyAll', () => {
    it('should destroy all timers', () => {
      const mockTimer1 = { destroy: vi.fn() };
      const mockTimer2 = { destroy: vi.fn() };
      Reflect.set(timerService, 'timers', [mockTimer1, mockTimer2]);

      timerService.destroyAll();

      expect(mockTimer1.destroy).toHaveBeenCalledTimes(1);
      expect(mockTimer2.destroy).toHaveBeenCalledTimes(1);
    });
  });
});
