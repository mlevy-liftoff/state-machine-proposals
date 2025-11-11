/**
 * Token service stub
 * In your actual project, this would load the statemachine and templates from your token/configuration system
 */

export interface TokenService {
  get(key: string): {
    statemachine: any;
    templates: Record<string, any>;
  };
}

const tokenService: TokenService = {
  get(key: string) {
    // In production, this would fetch from your actual token service
    // For this example, it would load from your configuration system
    
    if (key === 'AD_EXPERIENCE') {
      return {
        statemachine: {}, // Server-generated statemachine config
        templates: {
          video: {},      // Video child template
          endcard: {},    // Endcard child template
          image: {}       // Image child template
        }
      };
    }
    
    throw new Error(`Token not found: ${key}`);
  }
};

export default tokenService;

