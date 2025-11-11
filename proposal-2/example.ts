import service, { assign } from './service';
import tokenService from './token-service';

type Templates = {
  endcard?: any;
  image?: any;
  video?: any;
};

const serverJSON = /* paste your new JSON */ {} as any;

// Load statemachine and templates from token
const { statemachine, templates } = tokenService.get('AD_EXPERIENCE');

/**
 * Implementations
 * - Provide per-type actions/guards/delays.
 * - These are *merged* with shared base implementations so you can DRY common logic.
 */
const baseImpl = {
  actions: {
    SET_CAN_START_TIMER: assign({ canStartTimer: true }),
    OPEN_APP_STORE: () => {}
  },
  guards: {
    canStartTimer: (ctx: any) => !!ctx.canStartTimer,
    shouldOpenAppStore: (_ctx: any) => true
  },
  delays: {}
};

const implVideo = {
  actions: {
    incrementLoadAttempts: assign((ctx: any) => ({ loadAttempts: (ctx.loadAttempts ?? 0) + 1 })),
    emitLoad: () => {},
    setMetadata: () => {},
    reportVideoStart: () => {},
    setCanPlay: assign({ canPlay: true }),
    emitDurationChange: () => {},
    emitWaiting: () => {},
    emitSuspend: () => {},
    emitAwaitingViewability: () => {},
    emitPlay: () => {},
    updateCurrentTime: () => {},
    emitVideoCompleteEvents: () => {},
    pauseVideoElement: () => {},
    resetProgress: assign({ progress: 0 }),
    resetCurrentTime: assign({ currentTime: 0 }),
    playVideoElement: () => {},
    updateProgress: assign((ctx: any) => ({ progress: Math.min(1, (ctx.progress ?? 0) + 0.01) })),
    emitProgress: () => {},
    emitCheckpointEvent: () => {},
    emitTimeUpdate: () => {},
    emitClose: () => {},
    standbyTimers: () => {},
    pauseAllIntervals: () => {},
    wakeTimers: () => {},
    startAllIntervals: () => {},
    incrementLoopCount: assign((ctx: any) => ({ loopCount: (ctx.loopCount ?? 0) + 1 })),
    disableTheatreMode: () => {},
    emitCloseFullyPlayed: () => {}
  },
  guards: {}
};

const implEndcard = {
  actions: {
    MOUNT_IFRAME: (_ctx: any) => {}
  },
  guards: {
    endcardRenderableReady: (ctx: any, _evt: any, _meta: any) => ctx.ready
  }
};

const implImage = {
  actions: {
    MOUNT_IMAGE: (_ctx: any) => {}
  },
  guards: {
    endcardRenderableReady: (ctx: any, evt: any, meta: any) => ctx.ready
  }
};

/**
 * Implementations by type
 */
const implRegistry: Record<string, { actions?: any; guards?: any; delays?: any }> = {
  video:   implVideo,
  endcard: implEndcard,
  image:   implImage
};

/**
 * Deep-ish merge for { actions, guards, delays }
 */
function composeImpl(
  ...impls: Array<{ actions?: any; guards?: any; delays?: any }>
) {
  const out = { actions: {}, guards: {}, delays: {} } as any;
  for (const impl of impls) {
    if (!impl) continue;
    Object.assign(out.actions, impl.actions || {});
    Object.assign(out.guards, impl.guards || {});
    Object.assign(out.delays, impl.delays || {});
  }
  return out;
}

/**
 * Build a child machine from a type + settings
 */
function buildChild(
  type: string,
  id: string,
  settings = {},
) {
  const tpl = templates[type];
  if (!tpl || !tpl.states) {
    throw new Error(`Missing or invalid template for type: ${type}`);
  }
  const impl = composeImpl(baseImpl, implRegistry[type]);
  const machineConfig = {
    ...tpl,
    context: { ...(tpl.context ?? {}), id, ...settings }
  };
  return service.createMachine(machineConfig, impl);
}

/**
 * Parent implementation
 * - In proposal-2, we don't need activeId/refs management
 * - Each state invokes its own child via `invoke.src`
 */
const parentImpl = {
  actions: {
    beginPreload: assign((ctx: any) => ({
      primedCount: Math.max(1, ctx.primedCount ?? 0)
    })),

    activateChild: (_ctx: any, _evt: any, meta: any) => {
      // Optional: send SET_READY to the invoked child
      // The invoked child is automatically started when state is entered
      // Can access via meta.state.context or send events to it
    },

    routeToChild: (_ctx: any, evt: any, meta: any) => {
      // Route events to the currently invoked child
      // In state, you can use `send` with `to` option:
      // send(evt.event, { to: (ctx, evt, meta) => meta._event.origin })
      // Or the child can receive events via invoke onReceive
    },

    showAppStore: () => {
      // Show app store overlay
    },

    showLastChanceEndcard: () => {
      // Show last chance endcard
    },

    closeAd: () => {
      // Teardown / analytics / cleanup
    }
  },

  guards: {
    isPrimedEnough: (ctx: any) => (ctx.primedCount ?? 0) > 0
  },

  // Services map type strings to child factory functions
  services: {
    videoChild: (ctx: any) => buildChild('video', ctx.id, ctx),
    endcardChild: (ctx: any) => buildChild('endcard', ctx.id, ctx),
    imageChild: (ctx: any) => buildChild('image', ctx.id, ctx)
  }
};

const parentComposed = {
  ...composeImpl(baseImpl, parentImpl),
  services: parentImpl.services
};

const adMachine = service.createMachine(statemachine, parentComposed);
export const ad = service.start(adMachine);

// ========================================
// USAGE EXAMPLES
// ========================================

// 1. Get current state (which tells you which child is active)
const snap = service.snapshot(ad);
console.log('Current state:', snap.value); // 'main_video', 'html_endcard', etc.

// 2. Access the invoked child actor
const currentState = snap.value;
if (typeof currentState === 'string') {
  const childActor = snap.children.get(currentState);
  if (childActor) {
    const childSnap = service.snapshot(childActor);
    console.log('Child state:', childSnap.value);
    console.log('Child context:', childSnap.context);
  }
}

// 3. Send events to trigger transitions
ad.send({ type: 'NEXT' }); // Transitions to next state (next child)

// 4. Send events to child
// Option A: Via CHILD.EVENT convention
ad.send({ type: 'CHILD.EVENT', event: { type: 'PLAY' } });

// Option B: Directly to child actor
const currentSnap = service.snapshot(ad);
const childRef = currentSnap.children.get(currentSnap.value as string);
if (childRef) {
  childRef.send({ type: 'PLAY' });
}

// 5. React to state changes (DYNAMIC rendering based on type metadata)
service.subscribe(ad, (snap) => {
  console.log('State changed to:', snap.value);
  
  // Get the type from state meta (server-provided, dynamic)
  const currentState = snap.value as string;
  const stateMeta = snap.meta?.[`ad.${currentState}`]; // state meta format
  const type = stateMeta?.type;
  
  console.log('Current type:', type); // 'video', 'endcard', 'image', etc.
  
  // Get current child actor
  const childActor = snap.children.get(currentState);
  if (childActor) {
    const childState = service.snapshot(childActor);
    console.log('Child:', childState.value);
    
    // Render dynamically based on type (no hardcoded state names!)
    switch (type) {
      case 'video':
        // Render video component
        console.log('Rendering VideoComponent');
        break;
      case 'endcard':
        // Render endcard component
        console.log('Rendering EndcardComponent');
        break;
      case 'image':
        // Render image component
        console.log('Rendering ImageComponent');
        break;
      default:
        console.log('Unknown type:', type);
    }
  }
});

// 6. Helper function to get type from snapshot (dynamic, no hardcoding)
function getChildType(snapshot: any): string | undefined {
  const currentState = snapshot.value as string;
  // Access meta using state's format: machineId.stateName
  const stateMeta = snapshot.meta?.[`ad.${currentState}`];
  return stateMeta?.type;
}

const currentChildType = getChildType(snap);
console.log('Current child type:', currentChildType); // 'video', 'endcard', etc.

