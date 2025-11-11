import ContainerAwareService from '../container/container-aware-service';
import { TimerInterface, TimerServiceInterface } from './types';
import Timer from './timer';

class TimerService extends ContainerAwareService implements TimerServiceInterface {
  private timers: Array<TimerInterface>;

  private stash: Array<TimerInterface>;

  constructor(
    private paused = false,
  ) {
    super();
    this.timers = [];
    this.stash = [];
  }

  public destroyAll() {
    this.timers.forEach((timer) => {
      timer.destroy();
    });
    this.timers = [];
  }

  public getNewTimer(delay: number, callable?: () => void) {
    const timer = callable == null
      ? new Timer(delay, this)
      : new Timer(delay, this, callable);
    this.timers.push(timer);
    return timer;
  }

  public pauseAll() {
    this.paused = true;
    this.timers.forEach((timer) => {
      timer.pause();
    });
  }

  public standby() {
    if (this.stash.length !== 0) {
      return;
    }
    this.timers.forEach((timer) => {
      if (timer.getId() !== undefined) {
        timer.pause();
        this.stash.push(timer);
      }
    });
  }

  public wake() {
    if (this.stash.length === 0) {
      return;
    }

    const timer: TimerInterface | undefined = this.stash.pop();
    timer?.start();
    this.wake();
  }

  public startAll() {
    this.paused = false;
    this.timers.forEach((timer) => {
      timer.start();
    });
  }

  isPaused(): boolean {
    return this.paused;
  }

  static getServiceIdentifier() {
    return 'TimerServiceInterface';
  }
}

export default TimerService;
