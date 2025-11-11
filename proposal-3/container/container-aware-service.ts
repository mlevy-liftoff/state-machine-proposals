/*
 * This abstract class MUST be extended by all other services.
 * It is used to ensure that all services have a static getServiceIdentifier method.
 * This method is used to register the service with the container.
 */
abstract class ContainerAwareService {
  static readonly getServiceIdentifier: () => string;
}

export default ContainerAwareService;
