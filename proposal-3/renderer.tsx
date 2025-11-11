import { useEffect } from 'preact/hooks';
import { useSignal, useSignalEffect } from '@preact/signals';
import { adInterpreter, getCurrentChild } from './example';
import type { StateMachineInterpreter } from './types';

/**
 * Component Registry
 * Map child types to their rendering components
 */
const COMPONENT_MAP = {
  video: VideoComponent,
  endcard: EndcardComponent,
  image: ImageComponent
};

/**
 * Main Ad Renderer Component
 * 
 * Automatically subscribes to ad machine state changes and renders
 * the appropriate child component based on type metadata from the server.
 * Uses Preact Signals for efficient reactivity.
 */
export function AdRenderer() {
  const state = useSignal(adInterpreter.state);
  
  useEffect(() => {
    const subscription = adInterpreter.subscribe((newState) => {
      state.value = newState;
    });
    return () => subscription.unsubscribe();
  }, []);
  
  const currentState = state.value.value as string;
  const child = getCurrentChild(adInterpreter);
  
  // Handle loading state
  if (currentState === 'loading') {
    return <LoadingScreen />;
  }
  
  // Handle closed state
  if (currentState === 'closed') {
    return null;
  }
  
  // Render active child
  if (!child || !child.type || !child.actor) {
    return <ErrorScreen message="Invalid state" />;
  }
  
  const Component = COMPONENT_MAP[child.type];
  
  if (!Component) {
    console.error(`Unknown child type: ${child.type}`);
    return <ErrorScreen message={`Unknown type: ${child.type}`} />;
  }
  
  // Use stateName as key to force remount on state transitions
  return (
    <div className="ad-container" key={child.stateName}>
      <Component actor={child.actor} />
    </div>
  );
}

/**
 * Video Child Component
 */
function VideoComponent({ actor }: { actor: StateMachineInterpreter<any, any, any, any> }) {
  const state = useSignal(actor.state);
  
  useEffect(() => {
    const subscription = actor.subscribe((newState) => {
      state.value = newState;
    });
    return () => subscription.unsubscribe();
  }, [actor]);
  
  const handlePlay = () => actor.send({ type: 'PLAY' });
  const handlePause = () => actor.send({ type: 'PAUSE' });
  
  return (
    <div className="video-player">
      <video
        src={state.value.context.url}
        muted={state.value.context.muted}
        onPlay={handlePlay}
        onPause={handlePause}
        onEnded={() => actor.send({ type: 'END' })}
      />
      <ProgressBar progress={state.value.context.progress} />
      <CloseButton settings={state.value.context.close} />
      <div className="state-debug">Video State: {state.value.value}</div>
    </div>
  );
}

/**
 * Endcard Child Component
 */
function EndcardComponent({ actor }: { actor: StateMachineInterpreter<any, any, any, any> }) {
  const state = useSignal(actor.state);
  
  useEffect(() => {
    const subscription = actor.subscribe((newState) => {
      state.value = newState;
    });
    return () => subscription.unsubscribe();
  }, [actor]);
  
  const handleLoad = () => actor.send({ type: 'IFRAME_LOADED' });
  const handleError = () => actor.send({ type: 'IFRAME_ERROR' });
  
  return (
    <div className="endcard">
      <iframe
        src={state.value.context.url}
        onLoad={handleLoad}
        onError={handleError}
      />
      <CloseButton settings={state.value.context.close} />
      <div className="state-debug">Endcard State: {state.value.value}</div>
    </div>
  );
}

/**
 * Image Child Component
 */
function ImageComponent({ actor }: { actor: StateMachineInterpreter<any, any, any, any> }) {
  const state = useSignal(actor.state);
  
  useEffect(() => {
    const subscription = actor.subscribe((newState) => {
      state.value = newState;
    });
    return () => subscription.unsubscribe();
  }, [actor]);
  
  return (
    <div className="image-endcard">
      <img
        src={state.value.context.url}
        alt="Ad"
        onLoad={() => actor.send({ type: 'IMAGE_LOADED' })}
        onError={() => actor.send({ type: 'IMAGE_ERROR' })}
      />
      <CloseButton settings={state.value.context.close} />
      <div className="state-debug">Image State: {state.value.value}</div>
    </div>
  );
}

/**
 * Shared UI Components
 */

function LoadingScreen() {
  return (
    <div className="ad-loading">
      <div className="spinner" />
      <p>Loading ad...</p>
    </div>
  );
}

function ErrorScreen({ message }: { message: string }) {
  return (
    <div className="ad-error">
      <p>Error: {message}</p>
    </div>
  );
}

function ProgressBar({ progress }: { progress: number }) {
  return (
    <div className="progress-bar">
      <div 
        className="progress-fill" 
        style={{ width: `${progress * 100}%` }}
      />
    </div>
  );
}

function CloseButton({ settings }: { settings: any }) {
  const countdown = useSignal(
    settings?.countdown ? parseInt(settings.delay || '0') : 0
  );
  
  useSignalEffect(() => {
    if (countdown.value > 0) {
      const timer = setTimeout(() => {
        countdown.value = countdown.value - 1;
      }, 1000);
      return () => clearTimeout(timer);
    }
  });
  
  const handleClose = () => {
    if (countdown.value === 0) {
      // Advance to next state (eventually reaches closed)
      adInterpreter.send({ type: 'NEXT' });
    }
  };
  
  return (
    <button
      type="button"
      className="close-button"
      onClick={handleClose}
      disabled={countdown.value > 0}
      style={{ opacity: countdown.value > 0 ? 0.5 : 1 }}
    >
      {countdown.value > 0 ? `Close (${countdown.value})` : 'Close'}
    </button>
  );
}

