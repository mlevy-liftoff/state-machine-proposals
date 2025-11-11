import createContainerContext from '../create-container-context';

type LastChanceEndcardOverlayContextType = {
  isLastChanceEndcardOverlayShowing: boolean;
};

const LastChanceEndcardOverlayContext = createContainerContext<LastChanceEndcardOverlayContextType>({ isLastChanceEndcardOverlayShowing: false }, 'LastChanceEndcardOverlayContext');

export default LastChanceEndcardOverlayContext;
