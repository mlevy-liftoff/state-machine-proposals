import getTimerService from './get-timer-service';
import BindingResolutionError from '../container/binding-resolution-error';
import TimerService from './service';
import createMockContainer from '../../../tests/unit/helpers/create-mock-container';

describe('getTimerService', () => {
  it('should throw an error when no service exists', () => {
    const t = () => {
      getTimerService();
    };
    expect(t).toThrow(BindingResolutionError);
  });
  it('should return the service when it exists', () => {
    const mockContainer = createMockContainer({});
    const timerService = getTimerService();
    expect(timerService).toBeInstanceOf(TimerService);
    expect(timerService).toBe(mockContainer.get(TimerService.getServiceIdentifier()));
  });
});
