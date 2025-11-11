import Container from '../container/service';
import TimerService from './service';
import { TimerServiceInterface } from './types';

const getTimerService = (): TimerServiceInterface => {
  const container = Container.getInstance();
  const timerServiceIdentifier = TimerService.getServiceIdentifier();
  return container.get<TimerServiceInterface>(timerServiceIdentifier);
};

export default getTimerService;
