# State Machine Proposals: Server-side generation

This repository contains two architectural proposals for an ad renderer that dynamically generates state machines from server JSON. Both support dynamic component rendering without hardcoded state names.

## 📁 Repository Structure

```
.
├── README.md              # This file
├── COMPARISON.md          # Architectural comparison
├── PERFORMANCE.md         # Performance analysis
│
├── proposal-1/                      # Context-Based Approach
│   ├── input.json                   # Server input format
│   ├── output.json                  # Generated machine definition
│   └── example.ts                   # Client implementation
│
├── proposal-2/                      # State-Based (Educational)
│   ├── README.md
│   ├── input.json
│   ├── output.json
│   └── example.ts
│
├── proposal-3/                      # Production-Ready 🚀
│   ├── types.ts, service.ts, example.ts, renderer.tsx
│   ├── token-service.ts, error-messages.ts
│   ├── input.json, output.json
│   ├── container/, timer/ (dependencies)
│   └── README.md
│
└── proposal-4/                      # With Parallel States 🚀✨
    ├── types.ts†, service.ts†, example.ts, renderer.tsx
    ├── token-service.ts, error-messages.ts
    ├── input.json, output.json
    ├── container/, timer/ (dependencies)
    └── README.md
    
    † Enhanced with parallel state support
```

## 🎯 Quick Comparison

| Aspect | Proposal 1 | Proposal 2 | Proposal 3 | Proposal 4 |
|--------|-----------|-----------|-----------|-----------|
| **Architecture** | Context-based | State-based | State-based | State-based |
| **Purpose** | Educational | Educational | Production | Production+ |
| **Child Tracking** | `context.activeId` | Current state | Current state ✅ | Current state ✅ |
| **Type Lookup** | 3-4 steps | 2-3 steps | 2-3 steps ✅ | 2-3 steps ✅ |
| **Memory Usage** | All children loaded | Only current | Only current ✅ | Only current ✅ |
| **Performance** | Baseline | 60-80% better | 60-80% better ✅ | 60-80% better ✅ |
| **Code Quality** | Verbose | Verbose | Clean ✅ | Clean ✅ |
| **Invoke Support** | ❌ Spawn-based | ❌ Generic | ✅ Native ✅ | ✅ Native ✅ |
| **Parallel States** | ❌ No | ❌ No | ❌ No | ✅ **Yes** ✨ |
| **Renderer** | ❌ Basic | ❌ Basic | ✅ Complete | ✅ Complete |
| **Helper Functions** | ❌ No | ❌ Inline | ✅ Exported ✅ | ✅ Exported ✅ |

## 🏆 Recommendation

**Use Proposal 4 (Most Complete)** 🚀 if you need parallel states:
- ✅ Everything from Proposal 3
- ✅ **Full parallel state support** for child machines
- ✅ Handles complex child behaviors (video + overlay concurrently)

**Use Proposal 3 (Production-Ready)** 🚀 if you don't need parallel states:
- ✅ Simpler implementation
- ✅ State-based architecture
- ✅ Native invoke support
- ✅ Clean, type-safe code

**Use Proposal 2** for understanding the architecture (educational)

## 📖 Reading Guide

### Implementation Guides
1. **[proposal-4/README.md](proposal-4/README.md)** - With parallel states (most complete) 🚀
2. **[proposal-3/README.md](proposal-3/README.md)** - Without parallel states (simpler)

### Architectural Reference
3. **[COMPARISON.md](COMPARISON.md)** - Compare all approaches
4. **[PERFORMANCE.md](PERFORMANCE.md)** - Performance analysis
5. **[proposal-2/README.md](proposal-2/README.md)** - State-based concepts

## 🚀 Key Concepts

### The Problem
Server generates dynamic ad flows. Client doesn't know:
- What states exist
- Which states are videos vs endcards
- When to render which component

### The Solution
Server includes **type metadata** in the state machine definition:

**Proposal 1:**
```json
{
  "context": { "activeId": "main_video" },
  "meta": {
    "main_video": { "type": "video" }
  }
}
```

**Proposal 2:**
```json
{
  "states": {
    "main_video": {
      "meta": { "type": "video" }
    }
  }
}
```

Client uses type to dynamically render:
```jsx
const type = getType(snapshot); // "video"
const Component = COMPONENT_MAP[type];
return <Component actor={actor} />;
```

## 💡 Code Examples

### Proposal 1 (Context-Based)
```typescript
// 3 lookups to get type
const activeId = snapshot.context.activeId;
const meta = snapshot.meta['ad.ready'];
const type = meta[activeId].type;
const actor = snapshot.context.refs[activeId];
```

### Proposal 2 (State-Based - Educational)
```typescript
// 2 lookups to get type
const state = snapshot.value;
const type = snapshot.meta[`ad.${state}`]?.type;
const actor = snapshot.children.get(state);
```

### Proposal 3 (Production-Ready) 🚀
```typescript
// Clean, type-safe helpers
import { adInterpreter, getCurrentChild, sendToChild } from './example';
import { AdRenderer } from './renderer';

// Get current child
const child = getCurrentChild(adInterpreter);
if (child) {
  console.log(child.type, child.stateName);
  child.actor.send({ type: 'PLAY' });
}

// Render complete UI
render(<AdRenderer adInterpreter={adInterpreter} />, document.body);

// Control flow
adInterpreter.send({ type: 'NEXT' });
sendToChild(adInterpreter, { type: 'PAUSE' });
```

## 🔧 Implementation

Both proposals follow this pattern:

1. **Server:** Transform input JSON → State machine definition
2. **Client:** Fetch JSON, hydrate with actions/guards/services
3. **Render:** Use type metadata for dynamic component selection

```typescript
// Client hydration (both proposals)
const serverJSON = JSON.parse(tokenService.get('AD_EXPERIENCE'));

const machine = createMachine(serverJSON.statemachine, {
  services: { /* child factories */ },
  actions: { /* parent actions */ },
  guards: { /* conditions */ }
});

const service = interpret(machine).start();
```

## 📊 Performance Highlights

From **[PERFORMANCE.md](PERFORMANCE.md)**:

| Metric | Proposal 1 | Proposal 2 | Improvement |
|--------|-----------|-----------|-------------|
| Initial Load | 850ms | 320ms | **62% faster** |
| Memory Usage | 62MB | 23MB | **63% less** |
| Battery Drain | 3.2% | 1.4% | **56% less** |
| DOM Nodes | ~450 | ~80 | **82% less** |

## 🎨 Preact Rendering Pattern

Recommended pattern for both proposals:

```jsx
const COMPONENT_MAP = {
  video: VideoComponent,
  endcard: EndcardComponent,
  image: ImageComponent,
};

function AdRenderer({ adInterpreter }) {
  const state = useSignal(adInterpreter.state);
  
  useEffect(() => {
    const subscription = adInterpreter.subscribe((newState) => {
      state.value = newState;
    });
    return () => subscription.unsubscribe();
  }, []);
  
  const currentState = state.value.value as string;
  const child = getCurrentChild(adInterpreter);
  
  // Render dynamically
  const Component = COMPONENT_MAP[child.type];
  return (
    <div className="ad-container" key={child.stateName}>
      <Component actor={child.actor} />
    </div>
  );
}
```

## 🤝 Contributing

Questions or improvements? The key design decisions are:

1. **Type Metadata Location** - Where does the server put type info?
2. **Child Lifecycle** - When are children created/destroyed?
3. **Client Lookup** - How does the client find the current child?

Both proposals solve these differently. See [COMPARISON.md](COMPARISON.md) for details.
