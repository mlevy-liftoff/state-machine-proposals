# Proposal 4: Parallel State Support

Extends Proposal 3 with **parallel state support** for child state machines.


## Overview

Proposal 4 adds one feature to Proposal 3: **parallel states**.

Child machines can now have multiple concurrent regions that run independently:

```json
{
  "type": "parallel",
  "states": {
    "player": {
      "initial": "LOADING",
      "states": { "LOADING": {}, "PLAYING": {}, "PAUSED": {} }
    },
    "appStoreOnDelay": {
      "initial": "IDLE",
      "states": { "IDLE": {}, "WAITING": {}, "SHOWING": {} }
    }
  }
}
```

**State value becomes an object:**
```typescript
{
  player: "PLAYING",
  appStoreOnDelay: "WAITING"
}
```

Both regions run simultaneously - video can play while app store timer runs!

## What Changed

### Types (+50 lines)

```typescript
// State value can be object
value: string | Record<string, any>

// State nodes support nesting
type?: 'parallel' | 'final' | 'history'
states?: Record<string, StateNodeConfig>
initial?: string
```

### Service (+150 lines)

```typescript
// New functions
isParallelState(config): boolean
getInitialStateValue(key, config): string | object  
createParallelTransition(config): TransitionFn

// Enhanced createMachineInternal
- Detects parallel vs regular
- Computes parallel initial values
- Routes to parallel transition logic
```

### Example & Renderer

**No changes!** API is identical to Proposal 3.

## Usage Examples

### Basic Usage (Same as Proposal 3)

```typescript
import { adInterpreter, getCurrentChild, sendToChild } from './example';

// Parent control
adInterpreter.send({ type: 'NEXT' });

// Child access
const child = getCurrentChild(adInterpreter);
sendToChild(adInterpreter, { type: 'PLAY' });

// Access parallel state value
if (typeof child.actor.state.value === 'object') {
  console.log('Player:', child.actor.state.value.player);
  console.log('App Store:', child.actor.state.value.appStoreOnDelay);
}
```

### Shared Context Example

Parallel regions coordinate via shared context:

```typescript
// Video child has parallel regions sharing context
const videoChild = getCurrentChild(adInterpreter);
const state = videoChild.actor.state;

// Context shared by both regions
console.log('Can start timer:', state.context.canStartTimer);  // false initially

// Send event to player region
videoChild.actor.send({ type: 'PLAY' });

// Player enters PLAYING, runs SET_CAN_START_TIMER action
// context.canStartTimer becomes true

// appStoreOnDelay GATE state re-evaluates canStartTimer guard
// Passes now → automatically transitions IDLE → WAITING

// After 4 seconds → WAITING → SHOWING (app store button appears)

console.log(state.value);
// {
//   player: "PLAYING",
//   appStoreOnDelay: "SHOWING"
// }
```

## When to Use

**Use Proposal 4 if:**
- ✅ Your child templates have `"type": "parallel"`
- ✅ You need concurrent behaviors in children
- ✅ Your output.json matches this structure

**Use Proposal 3 if:**
- ✅ Your child templates are simple (no parallel)
- ✅ You want minimal complexity

## Files

```
proposal-4/
├── Core (6 files)
│   ├── types.ts              # +50 lines for parallel
│   ├── service.ts            # +150 lines for parallel logic
│   ├── example.ts            # Same as proposal-3
│   ├── renderer.tsx          # Same as proposal-3
│   ├── token-service.ts      # Same
│   └── error-messages.ts     # Same
│
├── Config (2 files)
│   ├── input.json
│   └── output.json
│
└── README.md
```

## Quick Example

```typescript
// Create a parallel child machine
const videoMachine = buildChild('video', { id: 'test' });
const interpreter = interpret(videoMachine).start();

// Initial value is an object
console.log(interpreter.state.value);
// { player: "LOADING", appStoreOnDelay: "GATE" }

// Send event - processes all regions
interpreter.send({ type: 'PLAY' });

// Only player region transitions
console.log(interpreter.state.value);
// { player: "PLAYING", appStoreOnDelay: "GATE" }
```

## Backward Compatible

Regular (non-parallel) machines work exactly as in Proposal 3:

```typescript
// Regular machine
{
  "initial": "idle",
  "states": {
    "idle": { "on": { "START": "active" } },
    "active": {}
  }
}

// State value is still a string
state.value = "active"
```


## Current Status

**✅ Implemented:**
- Parallel state support (multiple concurrent regions)
- Shared context between regions
- Event-based transitions across regions
- Type-safe parallel state values

**⚠️ Known Limitation:**
- `always` transitions not yet implemented (your templates use these in GATE states)

## Summary

**Proposal 4 = Proposal 3 + Parallel States (+200 lines)**

- Same clean architecture
- Same simple API  
- Enhanced types and service
- Handles parallel child machines with shared context
- Fully backward compatible

**Note:** Templates use `always` transitions (eventless auto-transitions) which need additional implementation (~100 lines).

Use this when your templates use `"type": "parallel"`! 🚀
