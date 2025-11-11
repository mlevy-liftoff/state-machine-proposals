import service, { assign } from './service';
import tokenService from './token-service';

type Templates = {
  endcard?: any;
  image?: any;
  video?: any;
};

type Implementations = {
  endcard: any;
  image: any;
  video: any;
}

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
  delays: {
    // example: SHOW_DELAY: 4000
  }
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
 * - Extend with new unit types without touching the parent logic.
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
 * Build a child machine from a type + id (+ optional per-instance overrides).
 * - Merges: baseImpl -> typeImpl -> instanceImpl (overrides win last)
 * - Injects per-instance context fields (e.g., id, url, flags) via ctxPatch.
 */
function buildChild(
  type: string,
  id: string,
  ctx = {},
  meta = {},
) {
  const tpl = templates[type];
  if (!tpl || !tpl.states) {
    throw new Error(`Missing or invalid template for type: ${type}`);
  }
  const impl = composeImpl(baseImpl, implRegistry[type]);
  const machineConfig = {
    ...tpl,
    context: { ...(tpl.context ?? {}), id, ...ctx },
    meta: { ...(tpl.meta ?? {}), ...meta }
  };
  return service.createMachine(machineConfig, impl);
}

// parent actions/guards that reference new meta shape
const parentImpl = {
  actions: {
    spawnChildrenFromMeta: assign((ctx: any, _evt: any, meta: any) => {
      const metaMap = meta ?? {};
      const refs: Record<string, any> = {};

      for (const [id, node] of Object.entries<any>(metaMap)) {
        if (!node || typeof node !== 'object' || !node.type) continue;
        const child = buildChild(node.type, id, node.context, node.meta);
        refs[id] = service.spawn(child);
      }
      return { refs };
    }),

    beginPreload: assign((ctx: any) => ({
      primedCount: Math.max(1, ctx.primedCount ?? 0)
    })),

    setActiveFirstFromMeta: assign((ctx: any) => ctx.activeId ? ctx : { ...ctx, activeId: 'main_video' }),

    activateActiveChild: (ctx: any) => {
      const ref = ctx.activeId ? ctx.refs?.[ctx.activeId] : null;
      // Optionally nudge the active child (e.g., SET_READY) based on UX.
      // if (ref) ref.send({ type: 'SET_READY' });
    },

    routeToActive: (ctx: any, evt: any) => {
      const ref = ctx.activeId ? ctx.refs?.[ctx.activeId] : null;
      if (ref && evt?.event) ref.send(evt.event);
    },

    switchToNext: assign((ctx: any, _evt: any, meta: any, self: any) => {
      const metaMap = meta ?? {};
      const active = ctx.activeId;
      const nextId = active ? metaMap[active]?.target : undefined;

      if (nextId === 'closed') {
        // Prefer: have a JSON transition ready → closed (GO_CLOSED)
        self.send({ type: 'GO_CLOSED' });
        return ctx; // keep state; close handled elsewhere
      }
      return nextId ? { ...ctx, activeId: nextId } : ctx;
    }),

    maybeAutoAdvance: (ctx: any, _evt: any, meta: any, self: any) => {
      const metaMap = meta ?? {};
      const active = ctx.activeId;
      const nextId = active ? metaMap[active]?.target : undefined;

      if (nextId === 'closed') {
        self.send({ type: 'GO_CLOSED' });
        return;
      }
      if (nextId) self.send({ type: 'NEXT' });
    },

    closeAd: () => {
      // teardown / analytics / cleanup
    }
  },

  guards: {
    isPrimedEnough: (ctx: any) => (ctx.primedCount ?? 0) > 0,
    hasNext: (ctx: any, _evt: any, meta: any) => {
      const metaMap = meta ?? {};
      const active = ctx.activeId;
      const nextId = active ? metaMap[active]?.target : undefined;
      return !!nextId && nextId !== 'closed';
    }
  }
};

// Merge parent impl into a full impl for the parent machine.
// (Child impls are provided per-instance by buildChild)
const parentComposed = composeImpl(baseImpl, parentImpl);

const adMachine = service.createMachine(statemachine, parentComposed);
export const ad = service.start(adMachine);

// Route to active child
ad.send({ type: 'CHILD.EVENT', event: { type: 'SET_READY' } });

// Direct to a specific child
const snap = service.snapshot(ad);
const mainVideo = snap.context.refs['main_video'];
if (mainVideo) mainVideo.send({ type: 'PLAY' });

// Follow meta[target]
ad.send({ type: 'NEXT' });

// Read states
const adSnap = service.snapshot(ad);
const activeId = adSnap.context.activeId;
const activeRef = activeId ? adSnap.context.refs[activeId] : null;
const childSnap = activeRef ? service.snapshot(activeRef) : undefined;
