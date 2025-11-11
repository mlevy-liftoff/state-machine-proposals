import { createMachine, interpret, assign } from './service';
import tokenService from './token-service';
import type {
  StateMachineEventObject,
  StateMachineTypestate,
  StateMachineConfig,
  StateMachine,
  StateMachineInterpreter
} from './types';

/**
 * Ad Machine Implementation
 * 
 * State-based architecture where each parent state invokes a child actor.
 * The current state represents the active child, with type metadata enabling
 * dynamic rendering. Native invoke support provides automatic lifecycle management.
 */

// =============================================================================
// 1. TYPE DEFINITIONS
// =============================================================================

interface AdContext {
  primedCount: number;
}

interface AdEvent extends StateMachineEventObject {
  type: 'NEXT';
}

type AdState = StateMachineTypestate<AdContext>;

interface ChildContext {
  id: string;
  canStartTimer?: boolean;
  [key: string]: any;
}

interface ChildEvent extends StateMachineEventObject {
  type: string;
}

type ChildState = StateMachineTypestate<ChildContext>;

// =============================================================================
// 2. LOAD SERVER-GENERATED CONFIG
// =============================================================================

const { statemachine, templates } = tokenService.get('AD_EXPERIENCE');

// =============================================================================
// 3. SHARED IMPLEMENTATIONS
// =============================================================================

const baseImpl = {
  actions: {
    SET_CAN_START_TIMER: assign<ChildContext, ChildEvent>({ canStartTimer: true }),
    OPEN_APP_STORE: () => {
      // Open app store overlay
    }
  },
  guards: {
    canStartTimer: (ctx: ChildContext) => !!ctx.canStartTimer,
    shouldOpenAppStore: () => true
  }
};

// =============================================================================
// 4. TYPE-SPECIFIC IMPLEMENTATIONS
// =============================================================================

const videoImpl = {
  actions: {
    incrementLoadAttempts: assign<ChildContext, ChildEvent>((ctx) => ({ 
      loadAttempts: ((ctx as any).loadAttempts ?? 0) + 1 
    })),
    emitLoad: () => {},
    setMetadata: () => {},
    reportVideoStart: () => {},
    setCanPlay: assign<ChildContext, ChildEvent>({ canPlay: true }),
    emitDurationChange: () => {},
    emitWaiting: () => {},
    emitSuspend: () => {},
    emitAwaitingViewability: () => {},
    emitPlay: () => {},
    updateCurrentTime: () => {},
    emitVideoCompleteEvents: () => {},
    pauseVideoElement: () => {},
    resetProgress: assign<ChildContext, ChildEvent>({ progress: 0 }),
    resetCurrentTime: assign<ChildContext, ChildEvent>({ currentTime: 0 }),
    playVideoElement: () => {},
    updateProgress: assign<ChildContext, ChildEvent>((ctx) => ({ 
      progress: Math.min(1, ((ctx as any).progress ?? 0) + 0.01) 
    })),
    emitProgress: () => {},
    emitCheckpointEvent: () => {},
    emitTimeUpdate: () => {},
    emitClose: () => {},
    standbyTimers: () => {},
    pauseAllIntervals: () => {},
    wakeTimers: () => {},
    startAllIntervals: () => {},
    incrementLoopCount: assign<ChildContext, ChildEvent>((ctx) => ({ 
      loopCount: ((ctx as any).loopCount ?? 0) + 1 
    })),
    disableTheatreMode: () => {},
    emitCloseFullyPlayed: () => {}
  }
};

const endcardImpl = {
  actions: {
    MOUNT_IFRAME: () => {}
  },
  guards: {
    endcardRenderableReady: (ctx: any) => !!ctx.ready
  }
};

const imageImpl = {
  actions: {
    MOUNT_IMAGE: () => {}
  },
  guards: {
    endcardRenderableReady: (ctx: any) => !!ctx.ready
  }
};

// Registry of implementations by child type
const implRegistry: Record<string, any> = {
  video: videoImpl,
  endcard: endcardImpl,
  image: imageImpl
};

// =============================================================================
// 5. UTILITIES
// =============================================================================

function composeImpl(...impls: any[]) {
  const out = { actions: {}, guards: {}, delays: {} } as any;
  for (const impl of impls) {
    if (!impl) continue;
    Object.assign(out.actions, impl.actions || {});
    Object.assign(out.guards, impl.guards || {});
    Object.assign(out.delays, impl.delays || {});
  }
  return out;
}

function buildChild(
  type: string, 
  context: ChildContext
): StateMachine<ChildContext, ChildEvent, ChildState> {
  const template = templates[type];
  if (!template) {
    throw new Error(`Missing template for type: ${type}`);
  }
  
  const impl = composeImpl(baseImpl, implRegistry[type]);
  const config: StateMachineConfig<ChildContext, ChildEvent, ChildState> = {
    ...template,
    context: { ...(template.context ?? {}), ...context }
  };
  
  return createMachine(config, impl);
}

// =============================================================================
// 6. PARENT MACHINE IMPLEMENTATION
// =============================================================================

const parentImpl = {
  actions: {
    beginPreload: assign<AdContext, AdEvent>((ctx) => ({
      primedCount: Math.max(1, ctx.primedCount ?? 0)
    })),

    showAppStore: () => {
      // Show app store button/overlay
    },

    closeAd: () => {
      // Teardown, analytics, cleanup
    }
  },

  guards: {
    isPrimedEnough: (ctx: AdContext) => (ctx.primedCount ?? 0) > 0
  },

  // Services provide child machine factories for invoke
  services: {
    videoChild: (ctx: ChildContext) => buildChild('video', ctx),
    endcardChild: (ctx: ChildContext) => buildChild('endcard', ctx),
    imageChild: (ctx: ChildContext) => buildChild('image', ctx)
  }
};

const fullImpl = {
  ...composeImpl(baseImpl, parentImpl),
  services: parentImpl.services
};

// =============================================================================
// 7. CREATE & START PARENT MACHINE
// =============================================================================

const adMachine = createMachine<AdContext, AdEvent, AdState>(
  statemachine as StateMachineConfig<AdContext, AdEvent, AdState>,
  fullImpl
);

export const adInterpreter = interpret(adMachine);

// Start the interpreter
adInterpreter.start();

export type AdInterpreter = StateMachineInterpreter<AdContext, AdEvent, AdState, any>;

// =============================================================================
// 8. HELPER FUNCTIONS FOR CLIENT
// =============================================================================

export interface CurrentChild {
  stateName: string;
  type: string;
  actor: StateMachineInterpreter<any, any, any, any>;
}

/**
 * Get information about the currently active child
 */
export function getCurrentChild(
  interpreter: StateMachineInterpreter<AdContext, AdEvent, AdState, any>
): CurrentChild | null {
  const snapshot = interpreter.state;
  const currentState = snapshot.value as string;
  
  // Skip non-child states
  if (currentState === 'loading' || currentState === 'closed') {
    return null;
  }
  
  const stateMetaKey = `ad.${currentState}`;
  const type = snapshot.meta?.[stateMetaKey]?.type;
  
  // Get child from interpreter.children (native invoke support)
  const actor = interpreter.children.get(currentState);
  
  if (!type || !actor) {
    return null;
  }
  
  return {
    stateName: currentState,
    type,
    actor
  };
}

/**
 * Send event to currently active child
 */
export function sendToChild(
  interpreter: StateMachineInterpreter<AdContext, AdEvent, AdState, any>,
  event: StateMachineEventObject
): void {
  const child = getCurrentChild(interpreter);
  if (child?.actor) {
    child.actor.send(event);
  }
}

// =============================================================================
// 9. USAGE EXAMPLE
// =============================================================================

/**
 * Example usage:
 * 
 * import { adInterpreter, getCurrentChild, sendToChild } from './example';
 * 
 * // Get current child
 * const child = getCurrentChild(adInterpreter);
 * if (child) {
 *   console.log(child.type, child.stateName);
 *   child.actor.send({ type: 'PLAY' });
 * }
 * 
 * // Advance to next state
 * adInterpreter.send({ type: 'NEXT' });
 * 
 * // Send to active child
 * sendToChild(adInterpreter, { type: 'PAUSE' });
 */

