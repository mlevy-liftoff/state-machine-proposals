import { VideoMachineContext, VideoMachineEvent } from '../../state-machines/video/machine-types';
import { StateMachineActionMap } from '../state-machine/service-types';
import { AdMachineContext } from '../../state-machines/ad/ad-machine-context';
import { AdMachineEvent } from '../../state-machines/ad/ad-machine-event';

export type TimerServiceActions =
  'standbyTimers'
  | 'wakeTimers';

type TimerMachineContext = AdMachineContext | VideoMachineContext;

type TimerMachineEvent = AdMachineEvent | VideoMachineEvent;

export type TimerServiceActionMap = StateMachineActionMap<TimerMachineContext, TimerMachineEvent, TimerServiceActions>;
