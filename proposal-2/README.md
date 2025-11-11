# Proposal 2: State-Based Child Management

## Key Differences from Proposal 1

### Proposal 1 (Context-Based)
- **Structure**: Single `ready` state with all children spawned upfront
- **Child Tracking**: Uses `activeId` context value to track current child
- **Child Storage**: All child actors stored in `refs` context object
- **Transitions**: Actions manipulate `activeId` to switch between children
- **Child Access**: Must read `context.activeId` then lookup `context.refs[activeId]`

### Proposal 2 (State-Based) ✨
- **Structure**: Each state represents a child (mirrors input JSON)
- **Child Tracking**: Current state IS the current child (no tracking needed)
- **Child Storage**: Each state invokes its own child actor
- **Transitions**: State-to-state transitions (e.g., `main_video` → `html_endcard`)
- **Child Access**: Invoked actor is directly accessible from parent state

## Benefits of State-Based Approach

1. **Matches Input Shape**: Output JSON structure closely mirrors the input JSON
2. **Simpler Mental Model**: "I'm in the video state" vs "I'm in ready state with activeId='video_0'"
3. **Lazy Loading**: Children are invoked only when their state is entered
4. **Built-in Cleanup**: state automatically stops invoked actors on state exit
5. **Easier Visualization**: State charts directly show the child flow
6. **No Context Pollution**: No need for `activeId` or `refs` bookkeeping

## How It Works

### Input JSON
```json
{
  "states": {
    "main_video": {
      "type": "video",
      "settings": { ... },
      "on": { "NEXT": { "target": "html_endcard" } }
    },
    "html_endcard": {
      "type": "endcard",
      "settings": { ... },
      "on": { "NEXT": { "target": "p2v_video" } }
    }
  }
}
```

### Output JSON
Each input state becomes a parent state that **invokes** the appropriate child:

```json
{
  "states": {
    "main_video": {
      "invoke": {
        "id": "main_video",
        "src": "videoChild",
        "data": { /* settings from input */ }
      },
      "on": { "NEXT": { "target": "html_endcard" } }
    },
    "html_endcard": {
      "invoke": {
        "id": "html_endcard", 
        "src": "endcardChild",
        "data": { /* settings from input */ }
      },
      "on": { "NEXT": { "target": "p2v_video" } }
    }
  }
}
```

## Server Transformation

The server transforms input states into output states by:

1. Creating a state for each input state
2. Adding `meta` field with:
   - `type`: The child type from input (`video`, `endcard`, `image`)
3. Adding `invoke` config with:
   - `src`: Maps type to child factory (`videoChild`, `endcardChild`, `imageChild`)
   - `data`: Passes settings as child context
4. Preserving transitions from input `on` handlers
5. Preserving entry/exit actions

### Transformation Example

**Input:**
```json
{
  "main_video": {
    "type": "video",
    "settings": { "muted": false },
    "on": { "NEXT": { "target": "html_endcard" } }
  }
}
```

**Output:**
```json
{
  "main_video": {
    "meta": { "type": "video" },
    "invoke": {
      "src": "videoChild",
      "data": { "id": "main_video", "muted": false }
    },
    "on": { "NEXT": { "target": "html_endcard" } }
  }
}
```

## Client Hydration

The client provides:

```typescript
const services = {
  videoChild: (ctx) => buildChild('video', ctx.id, ctx),
  endcardChild: (ctx) => buildChild('endcard', ctx.id, ctx),
  imageChild: (ctx) => buildChild('image', ctx.id, ctx)
};

const adMachine = createMachine(serverJSON.statemachine, {
  services,
  actions: { /* parent actions */ }
});
```

## Accessing Child State & Type

```typescript
// Proposal 1 (Context-Based)
const snap = service.snapshot(ad);
const activeId = snap.context.activeId; // "main_video"
const childRef = snap.context.refs[activeId];
const meta = snap.meta['ad.ready'];
const type = meta[activeId].type; // 'video', 'endcard', etc.
const childSnap = service.snapshot(childRef);

// Proposal 2 (State-Based) ✨
const snap = service.snapshot(ad);
const currentState = snap.value; // 'main_video', 'html_endcard', etc.
const type = snap.meta[`ad.${currentState}`]?.type; // 'video', 'endcard', etc.
const childActor = snap.children.get(currentState);
const childSnap = service.snapshot(childActor);
```

### Why Type Metadata?

Since the client receives dynamically generated JSON from the server, it doesn't know ahead of time which states are videos vs endcards. Each state includes a `meta.type` field so the client can dynamically render the appropriate component:

```typescript
function renderChild(snapshot) {
  const currentState = snapshot.value;
  const type = snapshot.meta[`ad.${currentState}`]?.type;
  
  // Use component registry for dynamic rendering
  const Component = COMPONENT_MAP[type]; // { video: VideoComponent, ... }
  const actor = snapshot.children.get(currentState);
  
  return <Component actor={actor} />;
}
```

## Trade-offs

### Advantages
- ✅ Cleaner, more intuitive structure
- ✅ Mirrors input JSON shape
- ✅ Lazy instantiation of children
- ✅ Automatic cleanup on state exit
- ✅ Better type safety (state value indicates child type)

### Considerations
- ⚠️ Child state is lost when exiting/re-entering (unless using history states)
- ⚠️ Cannot have multiple children active simultaneously (use parallel states if needed)
- ⚠️ Slightly more complex if you need to access non-current children

