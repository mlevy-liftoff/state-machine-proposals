/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Consolidated state machine types
 * This file includes all types needed for the state machine service
 */
export type SingleOrArray<T> = T[] | T;

export type StateMachineInitEvent = { type: 'xstate.init' };

export type StateMachineInterpreterStatus =
  | 'NotStarted'
  | 'Running'
  | 'Stopped';

export interface StateMachineEventObject {
  type: string;
}

export interface StateMachineTypestate<TContext extends object> {
  value: string;
  context: TContext;
}

export type MetaObject = Record<string, any>;

// Action types
export interface StateMachineActionObject<
  TContext extends object,
  TEvent extends StateMachineEventObject,
  TMeta extends MetaObject = MetaObject,
> {
  type: string;
  exec?: StateMachineActionFunction<TContext, TEvent, TMeta>;
  meta?: TMeta;
}

export type StateMachineActionFunction<
  TContext extends object,
  TEvent extends StateMachineEventObject,
  TMeta extends MetaObject = MetaObject,
> = (context: TContext, event: TEvent | StateMachineInitEvent, meta?: TMeta) => void;

type AssignAction = 'xstate.assign';

type Assigner<
  TContext extends object,
  TEvent extends StateMachineEventObject,
  TMeta extends MetaObject = MetaObject,
> = (
  context: TContext,
  event: TEvent,
  meta?: TMeta
) => Partial<TContext>;

type PropertyAssigner<
  TContext extends object,
  TEvent extends StateMachineEventObject,
  TMeta extends MetaObject = MetaObject,
> = {
  [K in keyof TContext]?:
  | ((context: TContext, event: TEvent, meta?: TMeta) => TContext[K])
  | TContext[K];
};

export type StateMachineAction<
  TContext extends object,
  TEvent extends StateMachineEventObject,
  TActions extends string = string,
  TMeta extends MetaObject = MetaObject,
> =
  | TActions
  | StateMachineAssignActionObject<TContext, TEvent, TMeta>
  | StateMachineActionObject<TContext, TEvent, TMeta>
  | StateMachineActionFunction<TContext, TEvent, TMeta>;

export type StateMachineActionMap<
  TContext extends object,
  TEvent extends StateMachineEventObject,
  TActions extends string = string,
  TMeta extends MetaObject = MetaObject,
> = Record<TActions, Exclude<StateMachineAction<TContext, TEvent, TActions, TMeta>, TActions>>;

// State types
export interface StateMachineState<
  TContext extends object,
  TEvent extends StateMachineEventObject,
  TState extends StateMachineTypestate<TContext>,
  TMeta extends MetaObject = MetaObject,
> {
  value: TState['value'];
  context: TContext;
  actions: Array<StateMachineActionObject<TContext, TEvent, TMeta>>;
  changed?: boolean;
  matches: <TSV extends TState['value']>(
    value: TSV
  ) => this is StateMachineState<
  (TState extends any
    ? { value: TSV; context: any } extends TState
      ? TState
      : never
    : never)['context'],
  TEvent,
  TState,
  TMeta
  > & { value: TSV };
  meta?: TMeta;
}

// Transition types
export type StateMachineTransition<
  TContext extends object,
  TEvent extends StateMachineEventObject,
  TStateValue extends string = string,
  TActions extends string = string,
  TMeta extends MetaObject = MetaObject,
> =
  | TStateValue
  | {
    target?: TStateValue;
    actions?: SingleOrArray<StateMachineAction<TContext, TEvent, TActions, TMeta>>;
    cond?: string | ((context: TContext, event: TEvent, meta?: TMeta) => boolean);
  };

export type StateMachineTransitionConfig<
  TContext extends object,
  TEvent extends StateMachineEventObject,
  TStateValue extends string = string,
  TActions extends string = string,
  TMeta extends MetaObject = MetaObject,
> = {
  [K in TEvent['type'] | '*']?: SingleOrArray<
    K extends '*'
      ? StateMachineTransition<TContext, TEvent, TStateValue, TActions, TMeta>
      : StateMachineTransition<
        TContext,
        TEvent extends { type: K } ? TEvent : never,
        TStateValue,
        TActions,
        TMeta
      >
  >;
}

export interface StateMachineAfterTransition<
  TContext extends object,
  TEvent extends StateMachineEventObject,
  TStateValue extends string = string,
  TActions extends string = string,
  TMeta extends MetaObject = MetaObject,
> {
  target?: TStateValue;
  actions?: SingleOrArray<StateMachineAction<TContext, TEvent, TActions, TMeta>>;
  cond?: string | ((context: TContext, event: TEvent, meta?: TMeta) => boolean);
}

export type StateMachineAfterConfig<
  TContext extends object,
  TEvent extends StateMachineEventObject,
  TStateValue extends string = string,
  TActions extends string = string,
  TMeta extends MetaObject = MetaObject,
> = Record<number | string, StateMachineAfterTransition<TContext, TEvent, TStateValue, TActions, TMeta>>;

export interface StateMachineStateNodeConfig<
  TContext extends object,
  TEvent extends StateMachineEventObject,
  TStateValue extends string = string,
  TActions extends string = string,
  TMeta extends MetaObject = MetaObject,
> {
  on?: StateMachineTransitionConfig<TContext, TEvent, TStateValue, TActions, TMeta>;
  exit?: SingleOrArray<StateMachineAction<TContext, TEvent, TActions, TMeta>>;
  entry?: SingleOrArray<StateMachineAction<TContext, TEvent, TActions, TMeta>>;
  after?: StateMachineAfterConfig<TContext, TEvent, TStateValue, TActions, TMeta>;
  meta?: TMeta;
}

// Machine config types
export interface StateMachineConfig<
  TContext extends object,
  TEvent extends StateMachineEventObject,
  TState extends StateMachineTypestate<TContext> = StateMachineTypestate<TContext>,
  TActions extends string = string,
  TMeta extends MetaObject = MetaObject,
> {
  id?: string;
  initial: TState['value'];
  context?: TContext;
  meta?: TMeta;
  states: {
    [_key in TState['value']]: StateMachineStateNodeConfig<TContext, TEvent, TState['value'], TActions, TMeta>;
  };
}

// Machine types
export interface StateMachine<
  TContext extends object,
  TEvent extends StateMachineEventObject,
  TState extends StateMachineTypestate<TContext>,
  TActions extends string = string,
  TMeta extends MetaObject = MetaObject,
> {
  config: StateMachineConfig<TContext, TEvent, TState, TActions, TMeta>;
  initialState: StateMachineState<TContext, TEvent, TState, TMeta>;
  implementations?: {
    actions?: Record<string, StateMachineAction<TContext, TEvent, TActions, TMeta>>,
    guards?: Record<string, (context: TContext, event: TEvent, meta?: TMeta) => boolean>,
    delays?: Record<string, StateMachineDelayFunction<TContext, TEvent, TMeta>>,
  };
  transition: (
    state: string | StateMachineState<TContext, TEvent, TState, TMeta>,
    event: TEvent['type'] | TEvent
  ) => StateMachineState<TContext, TEvent, TState, TMeta>;
}

// Service types
export type StateMachineStateListener<T extends StateMachineState<any, any, any, any>> = (state: T) => void;

export interface StateMachineInterpreter<
  TContext extends object,
  TEvent extends StateMachineEventObject,
  TState extends StateMachineTypestate<TContext> = { value: any; context: TContext },
  TMeta extends MetaObject = MetaObject,
> {
  send: (event: TEvent | TEvent['type']) => void;
  subscribe: (listener: StateMachineStateListener<StateMachineState<TContext, TEvent, TState, TMeta>>) => {
    unsubscribe: () => void;
  };
  start: (
    initialState?:
    | TState['value']
    | { context: TContext; value: TState['value'] }
  ) => StateMachineInterpreter<TContext, TEvent, TState, TMeta>;
  stop: () => StateMachineInterpreter<TContext, TEvent, TState, TMeta>;
  readonly status: StateMachineInterpreterStatus;
  readonly state: StateMachineState<TContext, TEvent, TState, TMeta>;
  readonly meta?: TMeta;
  children: Map<string, AnyStateMachineInterpreter>;
}

export interface StateMachineAssignActionObject<
  TContext extends object,
  TEvent extends StateMachineEventObject,
  TMeta extends MetaObject = MetaObject,
> extends StateMachineActionObject<TContext, TEvent, TMeta> {
  type: AssignAction
  assignment: Assigner<TContext, TEvent, TMeta> | PropertyAssigner<TContext, TEvent, TMeta>
  meta?: TMeta
}

export type StateMachineAssigner<
  TContext extends object,
  TEvent extends StateMachineEventObject,
  TMeta extends MetaObject = MetaObject,
> = Assigner<TContext, TEvent, TMeta> | PropertyAssigner<TContext, TEvent, TMeta>;

export type StateMachineConfigTransition<
  TContext extends object,
  TEvent extends StateMachineEventObject,
  TStateValue extends string = string,
  TMeta extends MetaObject = MetaObject,
> = {
  target?: TStateValue;
  actions?: SingleOrArray<string>;
  cond?: string | ((context: TContext, event: TEvent, meta?: TMeta) => boolean);
};

export type StateMachineDelayFunction<
  TContext extends object,
  TEvent extends StateMachineEventObject,
  TMeta extends MetaObject = MetaObject,
> = (context: TContext, event: TEvent, meta?: TMeta) => number;

export type StateMachineOptions<
  TContext extends object,
  TEvent extends StateMachineEventObject,
  TActions extends string = string,
  TMeta extends MetaObject = MetaObject,
> = {
  actions?: StateMachineActionMap<TContext, TEvent, TActions, TMeta>,
  guards?: Record<string, (context: TContext, event: TEvent, meta?: TMeta) => boolean>;
  delays?: Record<string, StateMachineDelayFunction<TContext, TEvent, TMeta>>;
};

export type StateMachineInterpreterStateListener<
  TState extends StateMachineState<any, any, any, any>,
> = (state: TState) => void;

// Utility types
type AnyStateMachineConfig = StateMachineConfig<any, any, any, any, any>;
type AnyStateMachineOptions = StateMachineOptions<any, any, any, any>;

export type AnyStateMachineInterpreter = StateMachineInterpreter<any, any, any, any>;
export type AnyStateMachine = StateMachine<any, any, any, any, any>;

export type StateMachineInterpreterMap = Map<string, AnyStateMachineInterpreter>;
export type StateMachineMap = Map<string, {
  config: AnyStateMachineConfig,
  options?: AnyStateMachineOptions
  machine: AnyStateMachine
}>;

// Service interface
export interface StateMachineServiceInterface {
  readonly machineMap: StateMachineMap;
  readonly interpreterMap: StateMachineInterpreterMap;

  createMachine: <
    TContext extends object,
    TEvent extends StateMachineEventObject,
    TState extends StateMachineTypestate<TContext>,
    TActions extends string,
    TMeta extends MetaObject,
  >(
    config: StateMachineConfig<TContext, TEvent, TState, TActions, TMeta>,
    options?: StateMachineOptions<TContext, TEvent, TActions, TMeta>
  ) => StateMachine<TContext, TEvent, TState, TActions, TMeta>;

  interpret: <
    TContext extends object,
    TEvent extends StateMachineEventObject,
    TState extends StateMachineTypestate<TContext>,
    TActions extends string,
    TMeta extends MetaObject,
  >(
    machine: StateMachine<TContext, TEvent, TState, TActions, TMeta>
  ) => StateMachineInterpreter<TContext, TEvent, TState, TMeta>;

  clear: (id?: string) => void;
}

// Function declarations
export declare function assign<
  TContext extends object,
  TEvent extends StateMachineEventObject = StateMachineEventObject,
  TMeta extends MetaObject = MetaObject,
>(
  assignment: StateMachineAssigner<TContext, TEvent, TMeta>
): StateMachineAssignActionObject<TContext, TEvent, TMeta>;
