import createContainerContext from '../create-container-context';
import { SceneInterface } from '../../../scenes/types';

export type SceneContextType = {
  scene: SceneInterface | undefined;
};

const SceneContext = createContainerContext<SceneContextType>({ scene: undefined }, 'SceneContext');

export default SceneContext;
