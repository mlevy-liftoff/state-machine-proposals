/**
 * This service is used to create and interpret state machines.
 * State machines are used to manage state (behaviour) in the application.
 */
import ContainerAwareService from './container/container-aware-service';
import {
  MetaObject,
  StateMachineAction,
  StateMachineActionFunction,
  StateMachineActionObject,
  StateMachineInitEvent,
  StateMachineInterpreterStatus,
  StateMachineStateListener,
  StateMachine,
  StateMachineAssignActionObject,
  StateMachineAssigner,
  StateMachineConfig,
  StateMachineEventObject,
  StateMachineInterpreter,
  StateMachineInterpreterMap,
  StateMachineMap,
  StateMachineOptions,
  StateMachineServiceInterface,
  StateMachineState,
  StateMachineTypestate,
  StateMachineAfterTransition,
  StateMachineStateNodeConfig,
  SingleOrArray,
  StateMachineDelayFunction,
  AnyStateMachineInterpreter,
} from './types';

import {
  MALFORMED_STATE_MACHINE_ERROR_MESSAGE,
  MISSING_STATE_MACHINE_IDENTIFIER_ERROR_MESSAGE,
} from './error-messages';

// Types for invoke support
interface InvokeConfig<TContext extends object = any> {
  id: string;
  src: string | ((context: TContext, event: StateMachineEventObject) => StateMachine<any, any, any>);
  data?: any | ((context: TContext, event: StateMachineEventObject) => any);
  onDone?: string | { target?: string; actions?: SingleOrArray<string> };
  onError?: string | { target?: string; actions?: SingleOrArray<string> };
}
import getTimerService from './timer/get-timer-service';
import { TimerInterface, TimerServiceInterface } from './timer/types';

// Constants
const INIT_EVENT: StateMachineInitEvent = { type: 'xstate.init' };
const ASSIGN_ACTION = 'xstate.assign';
const IS_PRODUCTION = true;

// Helper functions
function toArray<T>(item: T | T[] | undefined): T[] {
  return item === undefined ? [] : ([] as T[]).concat(item);
}

function isParallelState(stateConfig: any): boolean {
  return stateConfig?.type === 'parallel';
}

function getInitialStateValue(
  stateKey: string,
  stateConfig: any
): string | Record<string, any> {
  if (isParallelState(stateConfig)) {
    // For parallel states, return an object with all regions' initial states
    const parallelValue: Record<string, any> = {};
    for (const [regionKey, regionConfig] of Object.entries<any>(stateConfig.states || {})) {
      if (regionConfig.initial) {
        parallelValue[regionKey] = getInitialStateValue(regionConfig.initial, regionConfig.states?.[regionConfig.initial]);
      } else {
        parallelValue[regionKey] = regionKey;
      }
    }
    return parallelValue;
  }
  return stateKey;
}

function createMatcher<
  TState extends StateMachineTypestate<any>,
  TMeta extends MetaObject = MetaObject,
>(value: string) {
  return function matchesState<TStateValue extends TState['value']>(
    this: StateMachineState<TState['context'], StateMachineEventObject, TState>,
    stateValue: TStateValue
  ): this is StateMachineState<
    (TState extends any
      ? { value: TStateValue; context: any } extends TState
        ? TState
        : never
      : never)['context'],
    StateMachineEventObject,
    TState,
    TMeta
  > & { value: TStateValue } {
    return value === stateValue;
  };
}

function toEventObject<TEvent extends StateMachineEventObject>(
  event: TEvent['type'] | TEvent,
): TEvent {
  return (typeof event === 'string' ? { type: event } : event) as TEvent;
}

function createUnchangedState<
  TContext extends object,
  TEvent extends StateMachineEventObject,
  TState extends StateMachineTypestate<TContext>,
  TMeta extends MetaObject = MetaObject,
>(value: string, context: TContext, meta?: TMeta): StateMachineState<TContext, TEvent, TState, TMeta> {
  return {
    value,
    context,
    meta,
    actions: [],
    changed: false,
    matches: createMatcher<TState, TMeta>(value),
  };
}

function toActionObject<
  TContext extends object,
  TEvent extends StateMachineEventObject,
  TActions extends string = string,
  TMeta extends MetaObject = MetaObject,
>(
  action:
    | string
    | StateMachineActionFunction<TContext, TEvent, TMeta>
    | StateMachineActionObject<TContext, TEvent, TMeta>,
  actionMap?: Record<string, StateMachineAction<TContext, TEvent, TActions, TMeta>>,
): StateMachineActionObject<TContext, TEvent, TMeta> {
  if (typeof action === 'string') {
    const mappedAction = actionMap?.[action];
    if (mappedAction) {
      return toActionObject(mappedAction, actionMap);
    }
    return { type: action };
  }

  if (typeof action === 'function') {
    return {
      type: action.name ?? 'anonymous',
      exec: action,
    };
  }

  return action;
}

function handleActions<
  TContext extends object,
  TEvent extends StateMachineEventObject = StateMachineEventObject,
  TMeta extends MetaObject = MetaObject,
>(
  actions: Array<StateMachineActionObject<TContext, TEvent, TMeta>>,
  context: TContext,
  eventObject: TEvent,
): [Array<StateMachineActionObject<TContext, TEvent, TMeta>>, TContext, boolean] {
  let nextContext = context;
  let assigned = false;

  const nonAssignActions = actions.filter((action) => {
    if (action.type === ASSIGN_ACTION) {
      assigned = true;
      let tmpContext = { ...nextContext };

      const assignment = (action as StateMachineAssignActionObject<TContext, TEvent, TMeta>).assignment;
      if (typeof assignment === 'function') {
        tmpContext = { ...nextContext, ...assignment(nextContext, eventObject, action.meta) };
      } else {
        Object.keys(assignment).forEach((key) => {
          const k = key as keyof typeof assignment;
          const value = assignment[k];
          if (typeof value === 'function') {
            (tmpContext as any)[k] = value(nextContext, eventObject, action.meta);
          } else {
            (tmpContext as any)[k] = value;
          }
        });
      }

      nextContext = tmpContext;
      return false;
    }
    return true;
  });

  return [nonAssignActions, nextContext, assigned];
}

// Core state machine functions
function createMachineInternal<
  TContext extends object,
  TEvent extends StateMachineEventObject = StateMachineEventObject,
  TState extends StateMachineTypestate<TContext> = StateMachineTypestate<TContext>,
  TActions extends string = string,
  TMeta extends MetaObject = MetaObject,
>(
  fsmConfig: StateMachineConfig<TContext, TEvent, TState, TActions, TMeta>,
  implementations: {
    actions?: Record<string, StateMachineAction<TContext, TEvent, TActions, TMeta>>;
    guards?: Record<string, (context: TContext, event: TEvent, meta?: TMeta) => boolean>;
  } = {},
): StateMachine<TContext, TEvent, TState, TActions, TMeta> {
  const initialContext = fsmConfig.context ?? {} as TContext;
  
  // Handle parallel vs regular states
  const isParallel = isParallelState(fsmConfig);
  let initialValue: any;
  let initialStateConfig: any;
  
  if (isParallel) {
    // Parallel machine - all regions start simultaneously
    initialValue = {};
    const allEntryActions: any[] = [];
    
    for (const [regionKey, regionConfig] of Object.entries<any>(fsmConfig.states || {})) {
      if (regionConfig.initial) {
        initialValue[regionKey] = getInitialStateValue(regionConfig.initial, regionConfig.states?.[regionConfig.initial]);
        const regionInitialConfig = regionConfig.states?.[regionConfig.initial];
        if (regionInitialConfig) {
          allEntryActions.push(...toArray(regionInitialConfig.entry));
        }
      }
    }
    
    const [initialActions, processedContext] = handleActions(
      allEntryActions.map((action) => toActionObject(action, implementations.actions)),
      initialContext,
      INIT_EVENT as TEvent,
    );
    
    return {
      config: fsmConfig,
      implementations,
      initialState: {
        value: initialValue,
        context: processedContext,
        meta: fsmConfig.meta,
        actions: initialActions,
        changed: false,
        matches: () => false, // Parallel states don't match single values
      },
      transition: createParallelTransition(fsmConfig, implementations),
    };
  }
  
  // Regular machine
  if (!fsmConfig.initial) {
    throw new Error(`Initial state required for non-parallel machine${fsmConfig.id ? ` '${fsmConfig.id}'` : ''}`);
  }
  
  initialStateConfig = fsmConfig.states[fsmConfig.initial];
  const [initialActions, processedContext] = handleActions(
    toArray(fsmConfig.states[fsmConfig.initial].entry).map((action) => {
      const actionObject = toActionObject(action, implementations.actions);
      return { ...actionObject, meta: initialStateConfig?.meta };
    }),
    initialContext,
    INIT_EVENT as TEvent,
  );

  return {
    config: fsmConfig,
    implementations,
    initialState: {
      value: fsmConfig.initial,
      context: processedContext,
      meta: initialStateConfig.meta,
      actions: initialActions,
      changed: false,
      matches: createMatcher<TState, TMeta>(fsmConfig.initial),
    },
    transition: (
      fromState: string | StateMachineState<TContext, TEvent, TState, TMeta>,
      event: TEvent | TEvent['type'],
    ): StateMachineState<TContext, TEvent, TState, TMeta> => {
      const eventObject = toEventObject(event);
      const currentValue = typeof fromState === 'string' ? fromState : fromState.value;
      const currentContext = typeof fromState === 'string' ? (fsmConfig.context ?? {} as TContext) : fromState.context;
      const currentStateConfig = fsmConfig.states[currentValue as TState['value']];

      if (!IS_PRODUCTION && !currentStateConfig) {
        throw new Error(`State '${currentValue}' not found on machine ${fsmConfig.id ?? ''}`);
      }

      if (!currentStateConfig?.on) {
        return createUnchangedState(currentValue, currentContext, currentStateConfig?.meta);
      }

      const potentialTransitions = toArray(currentStateConfig.on[eventObject.type as TEvent['type']]);

      for (const transitionConfig of potentialTransitions) {
        if (!transitionConfig) continue;

        const { target, cond, actions } = typeof transitionConfig === 'string'
          ? { target: transitionConfig }
          : transitionConfig;

        // Check condition if present
        if (cond) {
          let guardResult = false;
          if (typeof cond === 'string') {
            const guardFn = implementations.guards?.[cond];
            if (!guardFn) {
              throw new Error(`Guard '${cond}' not found on machine ${fsmConfig.id ?? ''}`);
            }
            guardResult = guardFn(currentContext, eventObject as any, currentStateConfig.meta);
          } else {
            guardResult = cond(currentContext, eventObject as any, currentStateConfig.meta);
          }

          if (!guardResult) {
            continue;
          }
        }

        if (!target) {
          // Targetless transition - execute actions with current state meta
          const actionObjects = toArray(actions).map((action) => {
            const actionObj = toActionObject(action, implementations.actions);
            return { ...actionObj, meta: currentStateConfig.meta } as StateMachineActionObject<TContext, TEvent, TMeta>;
          });
          const [nonAssignActions, nextContext, assigned] = handleActions(actionObjects, currentContext, eventObject);

          return {
            value: currentValue,
            context: nextContext,
            meta: currentStateConfig?.meta,
            actions: nonAssignActions,
            changed: assigned,
            matches: createMatcher<TState, TMeta>(currentValue),
          };
        }

        // Targeted transition
        const targetStateConfig = fsmConfig.states[target as TState['value']];

        // Gather actions with proper meta for each phase
        const exitActions = toArray(currentStateConfig.exit || []).map((action) => {
          const actionObject = toActionObject(action, implementations.actions);
          return { ...actionObject, meta: currentStateConfig?.meta } as StateMachineActionObject<TContext, TEvent, TMeta>; // Source meta for exit
        });

        const transitionActions = toArray(actions).map((action) => {
          const actionObject = toActionObject(action, implementations.actions);
          return { ...actionObject, meta: currentStateConfig?.meta } as StateMachineActionObject<TContext, TEvent, TMeta>; // Source meta for transition
        });

        const entryActions = toArray(targetStateConfig?.entry || []).map((action) => {
          const actionObject = toActionObject(action, implementations.actions);
          return { ...actionObject, meta: targetStateConfig?.meta } as StateMachineActionObject<TContext, TEvent, TMeta>; // Target meta for entry
        });

        const allActions = [...exitActions, ...transitionActions, ...entryActions];
        const [nonAssignActions, nextContext] = handleActions(allActions, currentContext, eventObject);

        return {
          value: target,
          context: nextContext,
          meta: targetStateConfig?.meta,
          actions: nonAssignActions,
          changed: true,
          matches: createMatcher<TState, TMeta>(target),
        };
      }

      return createUnchangedState(currentValue, currentContext, currentStateConfig?.meta);
    },
  };
}

const executeStateActions = <
  TContext extends object,
  TEvent extends StateMachineEventObject,
  TState extends StateMachineTypestate<TContext> = { value: any; context: TContext },
  TMeta extends MetaObject = MetaObject,
>(
  state: StateMachineState<TContext, TEvent, TState, TMeta>,
  event: TEvent | StateMachineInitEvent,
) => {
  for (const action of state.actions) {
    const { exec } = action;
    exec?.(state.context, event as TEvent, action.meta);
  }
};

// Parallel state transition function
function createParallelTransition<
  TContext extends object,
  TEvent extends StateMachineEventObject,
  TState extends StateMachineTypestate<TContext>,
  TActions extends string,
  TMeta extends MetaObject
>(
  fsmConfig: StateMachineConfig<TContext, TEvent, TState, TActions, TMeta>,
  implementations: any
) {
  return (
    fromState: string | StateMachineState<TContext, TEvent, TState, TMeta>,
    event: TEvent | TEvent['type'],
  ): StateMachineState<TContext, TEvent, TState, TMeta> => {
    const eventObject = toEventObject(event);
    const currentValue = typeof fromState === 'string' ? {} : fromState.value;
    const currentContext = typeof fromState === 'string' ? (fsmConfig.context ?? {} as TContext) : fromState.context;
    
    // For parallel states, process transitions in each region
    const newValue: Record<string, any> = typeof currentValue === 'object' ? { ...currentValue } : {};
    let contextChanged = false;
    let nextContext = currentContext;
    const allActions: any[] = [];
    
    // Process each parallel region
    for (const [regionKey, regionConfig] of Object.entries<any>(fsmConfig.states || {})) {
      const regionCurrentValue = newValue[regionKey];
      const regionStateConfig = regionConfig.states?.[regionCurrentValue];
      
      if (!regionStateConfig?.on) {
        continue;
      }
      
      const potentialTransitions = toArray(regionStateConfig.on[eventObject.type as TEvent['type']]);
      
      for (const transitionConfig of potentialTransitions) {
        if (!transitionConfig) continue;
        
        const { target, cond, actions } = typeof transitionConfig === 'string'
          ? { target: transitionConfig }
          : transitionConfig;
        
        // Check condition if present
        if (cond) {
          let guardResult = false;
          if (typeof cond === 'string') {
            const guardFn = implementations.guards?.[cond];
            if (guardFn) {
              guardResult = guardFn(nextContext, eventObject as any, regionStateConfig.meta);
            }
          } else {
            guardResult = cond(nextContext, eventObject as any, regionStateConfig.meta);
          }
          
          if (!guardResult) {
            continue;
          }
        }
        
        if (target) {
          // Execute exit, transition, and entry actions for this region
          const exitActions = toArray(regionStateConfig.exit || []);
          const transitionActions = toArray(actions);
          const targetConfig = regionConfig.states?.[target];
          const entryActions = toArray(targetConfig?.entry || []);
          
          allActions.push(...exitActions, ...transitionActions, ...entryActions);
          newValue[regionKey] = target;
          contextChanged = true;
        } else {
          // Targetless transition - just execute actions
          allActions.push(...toArray(actions));
        }
        
        break;
      }
    }
    
    if (contextChanged) {
      const actionObjects = allActions.map((action) => toActionObject(action, implementations.actions));
      const [nonAssignActions, updatedContext] = handleActions(actionObjects, nextContext, eventObject);
      
      return {
        value: newValue,
        context: updatedContext,
        meta: fsmConfig.meta,
        actions: nonAssignActions,
        changed: true,
        matches: () => false,
      };
    }
    
    return {
      value: newValue,
      context: nextContext,
      meta: fsmConfig.meta,
      actions: [],
      changed: false,
      matches: () => false,
    };
  };
}

function interpretInternal<
  TContext extends object,
  TEvent extends StateMachineEventObject = StateMachineEventObject,
  TState extends StateMachineTypestate<TContext> = { value: any; context: TContext },
  TActions extends string = string,
  TMeta extends MetaObject = MetaObject,
>(
  machine: StateMachine<TContext, TEvent, TState, TActions, TMeta>,
  timerService: TimerServiceInterface,
  serviceRegistry?: Record<string, (context: any, event: StateMachineEventObject) => StateMachine<any, any, any>>,
): StateMachineInterpreter<TContext, TEvent, TState, TMeta> {
  let state = machine.initialState;
  let status: StateMachineInterpreterStatus = 'NotStarted';
  const listeners = new Set<StateMachineStateListener<typeof state>>();
  const activeTimers = new Map<string, TimerInterface>();
  const children = new Map<string, AnyStateMachineInterpreter>();

  const clearTimers = () => {
    for (const timer of activeTimers.values()) {
      timer.destroy();
    }
    activeTimers.clear();
  };

  const stopChildren = () => {
    for (const child of children.values()) {
      child.stop();
    }
    children.clear();
  };

  const startInvokedChildren = (currentState: StateMachineState<TContext, TEvent, TState, TMeta>) => {
    const stateConfig = machine.config.states[currentState.value as TState['value']] as any;
    
    if (!stateConfig?.invoke) {
      return;
    }

    const invokeConfigs = Array.isArray(stateConfig.invoke) 
      ? stateConfig.invoke 
      : [stateConfig.invoke];

    for (const invokeConfig of invokeConfigs) {
      if (!invokeConfig) continue;

      const { id, src, data, onDone, onError } = invokeConfig as InvokeConfig<TContext>;
      
      // Skip if child already exists
      if (children.has(id)) {
        continue;
      }

      try {
        // Resolve the child machine
        let childMachine: StateMachine<any, any, any>;
        
        if (typeof src === 'function') {
          // Direct machine factory function
          childMachine = src(currentState.context, { type: 'xstate.init' });
        } else if (typeof src === 'string') {
          // Named service from registry
          const serviceFactory = serviceRegistry?.[src];
          if (!serviceFactory) {
            if (!IS_PRODUCTION) {
              console.error(`Service '${src}' not found in registry for invoke in state '${currentState.value}'`);
            }
            continue;
          }
          
          // Resolve data for child context
          const childContext = typeof data === 'function'
            ? data(currentState.context, { type: 'xstate.init' })
            : data || {};
          
          childMachine = serviceFactory(childContext, { type: 'xstate.init' });
        } else {
          continue;
        }

        // Create and start child interpreter
        const childInterpreter = interpretInternal(childMachine, timerService, serviceRegistry);
        
        // Handle onDone if specified
        if (onDone && childMachine.config.states) {
          const finalStates = Object.entries(childMachine.config.states)
            .filter(([_, config]: [string, any]) => config.type === 'final')
            .map(([stateName]) => stateName);
          
          if (finalStates.length > 0) {
            childInterpreter.subscribe((childState) => {
              if (finalStates.includes(childState.value as string)) {
                // Child reached final state
                if (typeof onDone === 'string') {
                  service.send({ type: onDone } as TEvent);
                } else if (onDone.target) {
                  service.send({ type: onDone.target } as TEvent);
                } else if (onDone.actions) {
                  // Execute onDone actions
                  const doneActions = toArray(onDone.actions).map(action =>
                    toActionObject(action, machine.implementations?.actions)
                  );
                  for (const action of doneActions) {
                    action.exec?.(state.context, { type: 'xstate.done.invoke' } as TEvent, stateConfig.meta);
                  }
                }
              }
            });
          }
        }
        
        childInterpreter.start();
        children.set(id, childInterpreter);
      } catch (error) {
        if (!IS_PRODUCTION) {
          console.error(`Failed to invoke service '${id}':`, error);
        }
        
        // Handle onError if specified
        if (onError) {
          if (typeof onError === 'string') {
            service.send({ type: onError } as TEvent);
          } else if (onError.target) {
            service.send({ type: 'CHILD.ERROR', target: onError.target } as any);
          }
        }
      }
    }
  };

  const handleTimerTransition = (
    delay: string,
    transition: StateMachineAfterTransition<TContext, TEvent, TState['value'], TActions, TMeta>,
    stateConfig: StateMachineStateNodeConfig<TContext, TEvent, TState['value'], TActions, TMeta>
  ) => {
    const { target, actions = [], cond = () => true } = transition;

  // Handle both named guards and inline functions
  let guardResult = true;
  if (cond) {
    if (typeof cond === 'string') {
      // Resolve named guard
      const guardFn = machine.implementations?.guards?.[cond];
      if (!guardFn) {
        throw new Error(`Guard '${cond}' not found in implementations`);
      }
      guardResult = guardFn(state.context, { type: `xstate.after.${delay}` } as TEvent, stateConfig.meta);
    } else if (typeof cond === 'function') {
      // Inline guard function
      guardResult = cond(state.context, { type: `xstate.after.${delay}` } as TEvent, stateConfig.meta);
    }
  }

  if (!guardResult) {
    return;
  }

    const timerEvent = { type: `xstate.after.${delay}` } as TEvent;

    if (!target) {
      // Execute actions only (targetless transition)
      const actionObjects = toArray(actions).map((action) =>
        toActionObject(action, machine.implementations?.actions)
      );
      for (const action of actionObjects) {
        const { exec } = action;
        if (exec) {
          exec(state.context, timerEvent, stateConfig.meta);
        }
      }
      return;
    }

    // Handle targeted transition
    executeTargetedTransition(target, actions, stateConfig, timerEvent);
  };

  const executeTargetedTransition = (
    target: TState['value'],
    actions: SingleOrArray<StateMachineAction<TContext, TEvent, TActions, TMeta>>,
    sourceStateConfig: StateMachineStateNodeConfig<TContext, TEvent, TState['value'], TActions, TMeta>,
    timerEvent: TEvent
  ) => {
    // Resolve transition directly, not through machine.transition
    const targetStateConfig = machine.config.states[target as TState['value']];

    // Execute exit actions with source state meta
    const exitActions = toArray(sourceStateConfig.exit).map(action =>
      toActionObject(action, machine.implementations?.actions)
    );

    // Execute transition actions with source state meta
    const transitionActions = toArray(actions).map(action =>
      toActionObject(action, machine.implementations?.actions)
    );

    // Execute entry actions with target state meta
    const entryActions = toArray(targetStateConfig.entry).map(action =>
      toActionObject(action, machine.implementations?.actions)
    );

    const allActions = [...exitActions, ...transitionActions, ...entryActions];
    const [nonAssignActions, nextContext] = handleActions(allActions, state.context, timerEvent);

    // Stop children from old state
    stopChildren();

    // Update state directly
    state = {
      value: target,
      context: nextContext,
      meta: targetStateConfig?.meta,
      actions: nonAssignActions,
      changed: true,
      matches: createMatcher<TState, TMeta>(target),
    };

    // Execute actions with appropriate meta for each phase
    for (const action of exitActions) {
      if (action.exec) {
        action.exec(state.context, timerEvent, sourceStateConfig.meta); // Source meta for exit
      }
    }

    for (const action of transitionActions) {
      if (action.exec) {
        action.exec(state.context, timerEvent, sourceStateConfig.meta); // Source meta for transition
      }
    }

    for (const action of entryActions) {
      if (action.exec) {
        action.exec(state.context, timerEvent, targetStateConfig.meta); // Target meta for entry
      }
    }

    // Start invoked children for new state
    startInvokedChildren(state);

    // Notify listeners
    for (const listener of listeners) {
      listener(state);
    }

    // Start new timers for the new state
    startTimers(state);
  };

  const createAfterTimer = (
    delay: string,
    transition: StateMachineAfterTransition<TContext, TEvent, TState['value'], TActions, TMeta>,
    stateConfig: StateMachineStateNodeConfig<TContext, TEvent, TState['value'], TActions, TMeta>,
    currentStateValue: TState['value'],
    currentContext: TContext,
  ) => {
    let delayMs: number;

    // Check if delay is a number (direct delay) or a string (delay function name)
    const numericDelay = Number(delay);
    if (Number.isNaN(numericDelay)) {
      // It's a delay function name, resolve it from implementations
      const delayFunction = machine.implementations?.delays?.[delay];
      if (delayFunction) {
        // Create a synthetic event for the delay resolution
        const delayEvent = { type: `xstate.after.${delay}` } as TEvent;
        delayMs = delayFunction(currentContext, delayEvent, stateConfig.meta);
      } else {
        if (!IS_PRODUCTION) {
          throw new Error(`Delay function '${delay}' not found in machine implementations`);
        }
        return;
      }
    } else {
      delayMs = numericDelay;
    }

    const timerId = `${currentStateValue}_${delay}`;

    const timer = timerService.getNewTimer(delayMs, () => {
      handleTimerTransition(delay, transition, stateConfig);
      activeTimers.delete(timerId);
    });

    timer.start();
    activeTimers.set(timerId, timer);
  };

  const startTimers = (
    currentState: StateMachineState<TContext, TEvent, TState, TMeta>
  ) => {
    clearTimers();
    const stateConfig = machine.config.states[currentState.value as TState['value']];

    if (!stateConfig?.after) {
      return;
    }

    for (const entry of Object.entries(stateConfig.after)) {
      const [delay, transition] = entry;
      createAfterTimer(
        delay,
        transition,
        stateConfig,
        currentState.value,
        currentState.context
      );
    }
  };

  const service: StateMachineInterpreter<TContext, TEvent, TState, TMeta> = {
    send: (event: TEvent | TEvent['type']): void => {
      if (status !== 'Running') {
        return;
      }
      const previousValue = state.value;
      state = machine.transition(state, event);
      executeStateActions(state, toEventObject(event));
      
      // Handle state transitions - stop old children, start new ones
      if (state.changed && previousValue !== state.value) {
        stopChildren();
        startInvokedChildren(state);
      }
      
      listeners.forEach((listener) => listener(state));
      startTimers(state);
    },
    children,
    subscribe: (listener: StateMachineStateListener<typeof state>) => {
      listeners.add(listener);
      listener(state);

      return {
        unsubscribe: () => listeners.delete(listener),
      };
    },
    start: (
      initialState?:
        | TState['value']
        | { context: TContext; value: TState['value'] },
    ) => {
      if (initialState) {
        const resolved = typeof initialState === 'object'
          ? initialState
          : { context: machine.config.context ?? {} as TContext, value: initialState };
        const stateConfig = machine.config.states[resolved.value as TState['value']];
        state = {
          value: resolved.value,
          actions: [],
          context: resolved.context,
          meta: stateConfig?.meta,
          matches: createMatcher<TState, TMeta>(resolved.value),
        };

        if (!IS_PRODUCTION) {
          if (!(state.value in machine.config.states)) {
            throw new Error(
              `Cannot start service in state '${
                state.value
              }'. The state is not found on machine${
                machine.config.id ? ` '${machine.config.id}'` : ''
              }.`,
            );
          }
        }
      } else {
        state = machine.initialState;
      }
      status = 'Running';
      executeStateActions(state, INIT_EVENT);
      startInvokedChildren(state);
      startTimers(state);
      return service;
    },
    stop: () => {
      status = 'Stopped';
      clearTimers();
      stopChildren();
      listeners.clear();
      return service;
    },
    get state() {
      return state;
    },
    get status() {
      return status;
    },
    get meta() { // expose machine-level meta on interpreter
      return machine.config.meta;
    },
  };

  return service;
}

// Main service class
class StateMachineService extends ContainerAwareService implements StateMachineServiceInterface {
  interpreterMap: StateMachineInterpreterMap;

  machineMap: StateMachineMap;

  constructor(
    private readonly timerService = getTimerService(),
  ) {
    super();
    this.machineMap = new Map();
    this.interpreterMap = new Map();
  }

  createMachine<
    TContext extends object,
    TEvent extends StateMachineEventObject,
    TState extends StateMachineTypestate<TContext>,
    TActions extends string,
    TMeta extends MetaObject = MetaObject,
  >(
    config: StateMachineConfig<TContext, TEvent, TState, TActions, TMeta>,
    options?: StateMachineOptions<TContext, TEvent, TActions, TMeta>,
  ) {
    if (!config?.id) {
      throw new Error(MISSING_STATE_MACHINE_IDENTIFIER_ERROR_MESSAGE);
    }
    if (!this.machineMap.has(config.id)) {
      this.machineMap.set(config.id, { config, options, machine: createMachineInternal(config, options) });
    }
    const machineItem = this.machineMap.get(config.id);
    return machineItem?.machine as StateMachine<TContext, TEvent, TState, TActions, TMeta>;
  }

  interpret<
    TContext extends object,
    TEvent extends StateMachineEventObject,
    TState extends StateMachineTypestate<TContext>,
    TActions extends string,
    TMeta extends MetaObject = MetaObject,
  >(machine: StateMachine<TContext, TEvent, TState, TActions, TMeta>) {
    if (!machine?.config?.id) {
      throw new Error(MALFORMED_STATE_MACHINE_ERROR_MESSAGE);
    }
    if (!this.interpreterMap.has(machine.config.id)) {
      // Extract services from machine implementations
      const serviceRegistry = (machine.implementations as any)?.services;
      this.interpreterMap.set(machine.config.id, interpretInternal(machine, this.timerService, serviceRegistry));
    }
    return this.interpreterMap.get(machine.config.id) as StateMachineInterpreter<TContext, TEvent, TState, TMeta>;
  }

  clear(id?: string) {
    if (id) {
      this.machineMap.delete(id);
      this.interpreterMap.delete(id);
    } else {
      this.machineMap.clear();
      this.interpreterMap.clear();
    }
  }

  static getServiceIdentifier() {
    return 'StateMachineServiceInterface';
  }
}

// Exported helper functions
export function assign<
  TContext extends object,
  TEvent extends StateMachineEventObject,
  TMeta extends MetaObject = MetaObject,
>(assignment: StateMachineAssigner<TContext, TEvent, TMeta>): StateMachineAssignActionObject<TContext, TEvent, TMeta> {
  return {
    type: ASSIGN_ACTION,
    assignment,
  };
}

// Export standalone functions for easier migration from FSM
export function createMachine<
  TContext extends object,
  TEvent extends StateMachineEventObject = StateMachineEventObject,
  TState extends StateMachineTypestate<TContext> = StateMachineTypestate<TContext>,
  TActions extends string = string,
  TMeta extends MetaObject = MetaObject,
>(
  config: StateMachineConfig<TContext, TEvent, TState, TActions, TMeta>,
  implementations: {
    actions?: Record<string, StateMachineAction<TContext, TEvent, TActions, TMeta>>;
    guards?: Record<string, (context: TContext, event: TEvent, meta?: TMeta) => boolean>;
    delays?: Record<string, StateMachineDelayFunction<TContext, TEvent, TMeta>>;
    services?: Record<string, (context: any, event: StateMachineEventObject) => StateMachine<any, any, any>>;
  } = {},
): StateMachine<TContext, TEvent, TState, TActions, TMeta> {
  return createMachineInternal(config, implementations);
}

export function interpret<
  TContext extends object,
  TEvent extends StateMachineEventObject = StateMachineEventObject,
  TState extends StateMachineTypestate<TContext> = { value: any; context: TContext },
  TActions extends string = string,
  TMeta extends MetaObject = MetaObject,
>(
  machine: StateMachine<TContext, TEvent, TState, TActions, TMeta>,
  timerService: TimerServiceInterface = getTimerService(),
): StateMachineInterpreter<TContext, TEvent, TState, TMeta> {
  const serviceRegistry = (machine.implementations as any)?.services;
  return interpretInternal(machine, timerService, serviceRegistry);
}

export default StateMachineService;
