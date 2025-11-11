import createContainerContext from '../create-container-context';
import { Context } from '../types';
import SceneContext, { SceneContextType } from './scene-context';
import isVideoScene from '../../../scenes/type-guards/is-video-scene';

export type FragmentLoadingContextType = {
  startSn: number | undefined;
};

const FragmentLoadingContext = (sceneContext: Context<SceneContextType> = SceneContext) => {
  const currentScene = sceneContext.getValue().scene;

  return isVideoScene(currentScene)
    ? createContainerContext<FragmentLoadingContextType>({ startSn: undefined }, `FragmentLoadingContext_${currentScene?.getId()}`) : null;
};

export default FragmentLoadingContext;
