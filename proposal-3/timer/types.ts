export interface TimerInterface {
  getId(): number | undefined;
  start(): boolean;
  pause(): void;
  destroy(): void;
  asPromise(): Promise<void>;
  elapsedTime(): number;
  restartTimer(): boolean;
}

export interface TimerServiceInterface {
  destroyAll: () => void,
  getNewTimer: (delay: number, callable?: () => void) => TimerInterface,
  isPaused: () => boolean
  pauseAll: () => void,
  startAll: () => void,
  standby: () => void,
  wake: () => void,
}
