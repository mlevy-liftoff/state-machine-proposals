import getTimerService from './get-timer-service';
import { TimerServiceInterface } from './types';
import { TimerServiceActionMap } from './machine-types';

const getTimerServiceActions = (
  injectedTimerService?: TimerServiceInterface,
): TimerServiceActionMap => ({
  standbyTimers: () => {
    const timerService = injectedTimerService || getTimerService();
    timerService.standby();
  },
  wakeTimers: () => {
    const timerService = injectedTimerService || getTimerService();
    timerService.wake();
  },
});

export default getTimerServiceActions;
