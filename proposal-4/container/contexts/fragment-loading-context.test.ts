import Container from '../service';
import createVideoWithDefaults from '../../../../tests/unit/helpers/create-video-with-defaults';
import FragmentLoadingContext from './fragment-loading-context';
import createMockSceneContext from '../../../../tests/unit/helpers/create-mock-scene-context';

describe('FragmentLoadingContext', () => {
  afterEach(() => {
    Container.getInstance().reset();
  });

  it('should set a startSn when told to', () => {
    const videoScene = createVideoWithDefaults({ id: 'video_123' });
    const mockSceneContext = createMockSceneContext(videoScene);
    FragmentLoadingContext(mockSceneContext)?.setValue({ startSn: 1 });

    expect(FragmentLoadingContext(mockSceneContext)?.getValue().startSn).toEqual(1);
    expect(Container.getInstance().get('context_FragmentLoadingContext_video_123')).toBeDefined();
  });
});
