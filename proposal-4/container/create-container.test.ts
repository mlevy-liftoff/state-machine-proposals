import { expect, it, afterEach } from 'vitest';
import createContainer from './create-container';
import TokenService from '../token/service';
import ReportingService from '../reporting/service';
import StateMachineService from '../state-machine/service';
import MraidService from '../mraid/service';
import ErrorLoggingService from '../error-logging/service';
import EventStreamService from '../event-stream/service';
import TimerService from '../timer/service';
import IntervalService from '../interval/service';
import ObservabilityService from '../observability/service';
import ViewableService from '../viewable/service';
import ClickMetricsService from '../click-metrics/service';
import Container from './service';

describe('creating a container', () => {
  afterEach(() => {
    Container.getInstance().reset();
  });

  it('creates a container', () => {
    const container = createContainer();
    expect(container).toBeDefined();
  });

  it('creates a container with a token service', () => {
    const container = createContainer();
    expect(container.get('TokenServiceInterface')).toBeDefined();
    expect(container.get('TokenServiceInterface') instanceof TokenService).toBeTruthy();
  });

  it('creates a container with a reporting service', () => {
    const container = createContainer();
    expect(container.get('ReportingServiceInterface')).toBeDefined();
    expect(container.get('ReportingServiceInterface') instanceof ReportingService).toBeTruthy();
  });

  it('creates a container with a state machine service', () => {
    const container = createContainer();
    expect(container.get('StateMachineServiceInterface')).toBeDefined();
    expect(container.get('StateMachineServiceInterface') instanceof StateMachineService).toBeTruthy();
  });

  it('creates a container with a mraid service', () => {
    const container = createContainer();
    expect(container.get('MraidServiceInterface')).toBeDefined();
    expect(container.get('MraidServiceInterface') instanceof MraidService).toBeTruthy();
  });

  it('creates a container with a timer service', () => {
    const container = createContainer();
    expect(container.get('TimerServiceInterface')).toBeDefined();
    expect(container.get('TimerServiceInterface') instanceof TimerService).toBeTruthy();
  });

  it('creates a container with a interval service', () => {
    const container = createContainer();
    expect(container.get('IntervalServiceInterface')).toBeDefined();
    expect(container.get('IntervalServiceInterface') instanceof IntervalService).toBeTruthy();
  });

  it('creates a container with a observability service', () => {
    const container = createContainer();
    expect(container.get('ObservabilityServiceInterface')).toBeDefined();
    expect(container.get('ObservabilityServiceInterface') instanceof ObservabilityService).toBeTruthy();
  });

  it('creates a container with a viewable service', () => {
    const container = createContainer();
    expect(container.get('ViewableServiceInterface')).toBeDefined();
    expect(container.get('ViewableServiceInterface') instanceof ViewableService).toBeTruthy();
  });

  it('creates a container with an error logging service', () => {
    const container = createContainer();
    expect(container.get('ErrorLoggingServiceInterface')).toBeDefined();
    expect(container.get('ErrorLoggingServiceInterface') instanceof ErrorLoggingService).toBeTruthy();
  });

  it('creates a container with an event stream service', () => {
    const container = createContainer();
    expect(container.get('EventStreamServiceInterface')).toBeDefined();
    expect(container.get('EventStreamServiceInterface') instanceof EventStreamService).toBeTruthy();
  });

  it('creates a container with a click metrics service', () => {
    const container = createContainer();
    expect(container.get('ClickMetricsServiceInterface')).toBeDefined();
    expect(container.get('ClickMetricsServiceInterface') instanceof ClickMetricsService).toBeTruthy();
  });
});
