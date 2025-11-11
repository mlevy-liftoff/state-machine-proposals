# Proposal Comparison: Context-Based vs State-Based

## Overview

Both proposals transform input JSON (describing an ad flow with videos/endcards) into state machine definitions. The key difference is **how they track which child is currently active**.

---

## Proposal 1: Context-Based (activeId)

### Architecture
```
Parent Machine
├── loading
├── ready (ALL children active here)
│   ├── context.activeId = "video_0" | "endcard_0" | ...
│   ├── context.refs = { video_0: Actor, endcard_0: Actor, ... }
│   └── All child actors spawned upfront
└── closed
```

### JSON Structure
```json
{
  "states": {
    "ready": {
      "entry": ["spawnChildrenFromMeta", "setActiveFirstFromMeta"],
      "on": {
        "NEXT": { "actions": ["switchToNext"] }
      }
    }
  },
  "context": {
    "activeId": "main_video",
    "refs": {}
  },
  "meta": {
    "main_video": { "type": "video", "target": "html_endcard" },
    "html_endcard": { "type": "endcard", "target": "p2v_video" },
    "p2v_video": { "type": "video", "target": "closed" }
  }
}
```

### How It Works
1. All children are spawned at once in the `ready` state
2. `context.activeId` points to the current child ID
3. Actions like `switchToNext` update `activeId` to change children
4. Access child: `context.refs[context.activeId]`

### Pros
- ✅ All children available simultaneously
- ✅ Can switch between children without losing state
- ✅ Easy to access any child at any time

### Cons
- ❌ More complex mental model (indirection via activeId)
- ❌ All children loaded upfront (memory overhead)
- ❌ Need manual cleanup logic
- ❌ Context pollution (`activeId`, `refs`)
- ❌ Doesn't mirror input JSON structure

---

## Proposal 2: State-Based (invoke)

### Architecture
```
Parent Machine
├── loading
├── main_video (invokes video child)
├── html_endcard (invokes endcard child)
├── p2v_video (invokes video child)
└── closed
```

### JSON Structure
```json
{
  "states": {
    "main_video": {
      "invoke": {
        "src": "videoChild",
        "data": { "id": "main_video", "settings": {...} }
      },
      "on": {
        "NEXT": { "target": "html_endcard" }
      }
    },
    "html_endcard": {
      "invoke": {
        "src": "endcardChild",
        "data": { "id": "html_endcard", "settings": {...} }
      },
      "on": {
        "NEXT": { "target": "p2v_video" }
      }
    }
  }
}
```

### How It Works
1. Each parent state represents one child
2. Entering a state invokes (starts) that child
3. Exiting a state stops that child
4. Transitions are state-to-state (natural state flow)
5. Access child: `snapshot.children.get(snapshot.value)`

### Pros
- ✅ Simple, intuitive mental model
- ✅ Mirrors input JSON structure closely
- ✅ Lazy loading (children created on-demand)
- ✅ Automatic cleanup (state stops invoked actors)
- ✅ Better type safety (state name = child type)
- ✅ Cleaner context (no bookkeeping needed)
- ✅ Easier visualization in state charts

### Cons
- ❌ Child state lost when exiting (unless using history states)
- ❌ Only one child active at a time (use parallel states if needed)
- ❌ Accessing non-current children requires workarounds

---

## Side-by-Side Code Comparison

### Accessing Current Child & Type

**Proposal 1 (Context-Based)**
```typescript
const snap = service.snapshot(ad);
const activeId = snap.context.activeId;        // "main_video"
const childRef = snap.context.refs[activeId];  // lookup
const meta = snap.meta['ad.ready'];
const type = meta[activeId].type;              // "video"
const childSnap = service.snapshot(childRef);
```

**Proposal 2 (State-Based)**
```typescript
const snap = service.snapshot(ad);
const currentState = snap.value;               // "main_video"
const type = snap.meta[`ad.${currentState}`]?.type; // "video"
const childActor = snap.children.get(currentState);
const childSnap = service.snapshot(childActor);
```

### Advancing to Next Child

**Proposal 1 (Context-Based)**
```typescript
// Action updates context.activeId
actions: {
  switchToNext: assign((ctx, evt, meta) => {
    const nextId = meta[ctx.activeId]?.target;
    return { ...ctx, activeId: nextId };
  })
}
```

**Proposal 2 (State-Based)**
```typescript
// Standard state state transition
"on": {
  "NEXT": { "target": "html_endcard" }
}
```

### Rendering Logic (Dynamic, Server-Driven)

**Proposal 1 (Context-Based)**
```typescript
const activeId = snapshot.context.activeId;
const childRef = snapshot.context.refs[activeId];

// Look up type from meta (3 steps)
const meta = snapshot.meta['ad.ready'];
const type = meta[activeId].type;

// Component registry
const Component = COMPONENT_MAP[type]; // 'video', 'endcard', 'image'
return <Component actor={childRef} />;
```

**Proposal 2 (State-Based)**
```typescript
const currentState = snapshot.value;
const actor = snapshot.children.get(currentState);

// Look up type from meta (2 steps)
const type = snapshot.meta[`ad.${currentState}`]?.type;

// Component registry
const Component = COMPONENT_MAP[type]; // 'video', 'endcard', 'image'
return <Component actor={actor} />;
```

---

## Server Transformation Complexity

### Proposal 1
```typescript
// Transform input states → meta objects
// Create single "ready" state
// Generate context-switching actions
// More imperative, manual management
```

### Proposal 2
```typescript
// Transform input states → output states (1:1 mapping)
// Add invoke config to each state
// Preserve transitions as-is
// More declarative, state-native
```

---

## Recommendation

**Use Proposal 2 (State-Based)** if:
- You want cleaner, more maintainable code
- You value declarative state management
- You want the output to mirror input structure
- Memory efficiency is important (lazy loading)
- You don't need to preserve child state across transitions

**Use Proposal 1 (Context-Based)** if:
- You need all children available simultaneously
- You need to preserve child state when switching
- You need to access non-current children frequently
- You need more control over child lifecycle

---

## Migration Path

Proposal 1 → Proposal 2 is straightforward:
1. Convert `meta` entries to `states` with `invoke`
2. Remove `activeId` and `refs` from context
3. Replace context-switching actions with state transitions
4. Update rendering logic to use `snapshot.value` instead of `snapshot.context.activeId`

---

## Visual Comparison

### Proposal 1 Flow
```
[ready]
  ↓ context.activeId = "main_video"
  → (main_video actor playing)
  ↓ NEXT → update activeId = "html_endcard"
  → (html_endcard actor playing, main_video still in memory)
  ↓ NEXT → update activeId = "p2v_video"
  → (p2v_video actor playing, still all in memory)
  ↓ NEXT → update activeId = "closed"
  → [closed]
```

### Proposal 2 Flow
```
[loading]
  ↓
[main_video] ← invokes video actor
  ↓ NEXT
[html_endcard] ← invokes endcard actor, stops video
  ↓ NEXT
[p2v_video] ← invokes video actor, stops endcard
  ↓ NEXT
[closed]
```

