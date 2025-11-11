/**
 * This function is used to create the container.
 * The container is used to manage services.
 * @returns {Container} The container.
 */
import Container from './service';
import TokenService from '../token/service';
import ReportingService from '../reporting/service';
import StateMachineService from '../state-machine/service';
import MraidService from '../mraid/service';
import IntervalService from '../interval/service';
import TimerService from '../timer/service';
import ObservabilityService from '../observability/service';
import ViewableService from '../viewable/service';
import MuteService from '../mute/service';
import ErrorLoggingService from '../error-logging/service';
import EventStreamService from '../event-stream/service';
import UrlCacheService from '../url-cache/service';
import HTMLDecoderService from '../html-decoder/service';
import SmartDownloadQueueService from '../smart-download-queue/service';
import PictureInPictureService from '../picture-in-picture/service';
import UserActivityService from '../user-activity/service';
import ClickMetricsService from '../click-metrics/service';
import CloseButtonService from '../close-button/service';
import MraidEventStreamService from '../mraid-events-proxy/service';

const createContainer = () => {
  const container = Container.getInstance();

  // Level 1: Services with no dependencies
  container.bind(ReportingService.getServiceIdentifier(), new ReportingService())
  .bind(TokenService.getServiceIdentifier(), new TokenService())
  .bind(TimerService.getServiceIdentifier(), new TimerService())
  .bind(IntervalService.getServiceIdentifier(), new IntervalService())
  .bind(ViewableService.getServiceIdentifier(), new ViewableService())
  .bind(MuteService.getServiceIdentifier(), new MuteService())
  .bind(CloseButtonService.getServiceIdentifier(), new CloseButtonService())

  // Level 2: Services that only depend on Level 1 services
  .bind(StateMachineService.getServiceIdentifier(), new StateMachineService())
  .bind(EventStreamService.getServiceIdentifier(), new EventStreamService())
  .bind(MraidService.getServiceIdentifier(), new MraidService())
  .bind(MraidEventStreamService.getServiceIdentifier(), new MraidEventStreamService())

  // Level 3: Services that depend on Level 1 and Level 2 services
  .bind(ErrorLoggingService.getServiceIdentifier(), new ErrorLoggingService())

  // Level 4: Services that depend on multiple previous levels
  .bind(ObservabilityService.getServiceIdentifier(), new ObservabilityService())
  .bind(UrlCacheService.getServiceIdentifier(), new UrlCacheService())
  .bind(UserActivityService.getServiceIdentifier(), new UserActivityService())
  .bind(HTMLDecoderService.getServiceIdentifier(), new HTMLDecoderService())
  .bind(PictureInPictureService.getServiceIdentifier(), new PictureInPictureService())
  .bind(ClickMetricsService.getServiceIdentifier(), new ClickMetricsService())
  .bind(SmartDownloadQueueService.getServiceIdentifier(), new SmartDownloadQueueService());

  return container;
};

export default createContainer;
