import { TimerInterface, TimerServiceInterface } from './types';

class Timer implements TimerInterface {
  private id: number | undefined;

  private startTime?: number;

  private remainingTime: number;

  private isDestroyed: boolean;

  private promiseResolve?: () => void;

  private promiseReject?: (reason?: any) => void;

  private elapsed: number;

  constructor(
    protected delay: number,
    protected timerService: TimerServiceInterface,
    protected callable?: () => void,
  ) {
    this.remainingTime = delay;
    this.elapsed = 0;
    this.isDestroyed = false;
  }

  getId(): number | undefined {
    return this.id;
  }

  start(): boolean {
    if (this.timerService.isPaused()) {
      return false; // The timer service is in a paused state, presumably because of loss of viewability
    }

    if (this.isDestroyed || this.id !== undefined) {
      return false;
    }

    this.startTime = Date.now();
    this.id = window.setTimeout(() => {
      if (this.callable) {
        this.callable();
      }
      this.id = undefined;
      this.remainingTime = this.delay;
      if (this.promiseResolve) {
        this.promiseResolve();
      }
      this.destroy();
    }, this.remainingTime);

    return true;
  }

  pause(): void {
    if (this.id !== undefined && this.startTime !== undefined) {
      clearTimeout(this.id);
      const now = Date.now();
      const elapsedThisSession = now - this.startTime;
      this.elapsed += elapsedThisSession;
      this.remainingTime -= elapsedThisSession;
    }

    this.startTime = undefined;
    this.id = undefined;
  }

  destroy(): void {
    if (this.id !== undefined) {
      clearTimeout(this.id);
      this.id = undefined;
    }

    if (this.startTime !== undefined) {
      const now = Date.now();
      this.elapsed += now - this.startTime;
      this.startTime = undefined;
    }

    this.isDestroyed = true;

    if (this.promiseReject) {
      this.promiseReject(false);
    }
  }

  asPromise(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.promiseResolve = resolve;
      this.promiseReject = reject;

      if (this.isDestroyed) {
        reject(new Error('The timer has been destroyed and cannot be started.'));
      } else {
        this.start();
      }
    });
  }

  elapsedTime(): number {
    if (this.startTime !== undefined) {
      return this.elapsed + (Date.now() - this.startTime);
    }
    return this.elapsed;
  }

  restartTimer(): boolean {
    this.pause();
    this.elapsed = 0;
    this.remainingTime = this.delay;
    return this.start();
  }
}

export default Timer;
