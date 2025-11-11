export interface BindingResolutionErrorInterface extends Error {}

class BindingResolutionError extends Error implements BindingResolutionErrorInterface {}

export default BindingResolutionError;
