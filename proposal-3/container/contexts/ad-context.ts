import createContainerContext from '../create-container-context';
import {
  Dsp, OperatingSystem, PlacementType,
} from './types';
import DeepReadonly from '../../../util/deep-readonly';

export interface AdvertiserDataInterface {
  appStoreId?: string // APP_STORE_ID token, optional because it may not be available in all cases
  creative: {
    format: string // CREATIVE_FORMAT token
    formatVersion: string // CREATIVE_FORMAT_VERSION token
    id: string // CREATIVE_ID token
    type: string // CREATIVE_TYPE token
    is: {
      freeForm: boolean // AD_EXPERIENCE token
      adPodding: boolean // AD_PODDING token
    }
  }
  domain: string // ADVERTISER_DOMAIN token
  dsp: Dsp
  headerBidding: boolean // HEADER_BIDDING token
  mediation: string // MEDIATION_NAME token
  disableEndcardCache: boolean // DISABLE_ENDCARD_CACHE token
}

export interface DeviceDataInterface {
  ado: boolean // ADO_ENABLED token
  countryCode: string
  model: string // USER_AGENT token
  os: {
    name: OperatingSystem // PLATFORM token
    version: string // USER_AGENT token
    is: {
      iOS: boolean
      android: boolean
      amazon: boolean
      unknown: boolean
    }
  }
  skpv: {
    hasMaskIssue: boolean // src/services/store-kit-product-view/store-kit-product-view-service-resolver.ts
    hasSwipeIssue: boolean // src/services/store-kit-product-view/store-kit-product-view-service-resolver.ts
  }
  type: string // USER_AGENT token
}

export interface GdprDataInterface {
  accept: string
  body: string
  deny: string
  requiresConsent: boolean
  title: string
}

export interface IncentivizedDataInterface {
  body: string // INCENTIVIZED_BODY_TEXT token
  close: string // INCENTIVIZED_CLOSE_TEXT token
  continue: string // INCENTIVIZED_CONTINUE_TEXT token
  title: string // INCENTIVIZED_TITLE_TEXT token
}

export interface PlacementDataInterface {
  id: string // PLACEMENT_ID token
  is: {
    banner: boolean // isBanner
    fullscreen: boolean // isFullscreen
    inLine: boolean // isInLine
    mrec: boolean // isMrec
    rewarded: boolean // isRewarded
  }
  type: PlacementType // PLACEMENT_TYPE token
}

export interface PlatformDataInterface {
  accTests?: string // ACC_TESTS token, optional because it may not be available in all cases
  nautilusVersion: string // NAUTILUS_VERSION token
  observability: boolean // OBSERVABILITY token
  observedExperiments: string // OBSERVED_EXPERIMENTS token
  sessionId: string // SESSION_ID token
  privacyUrl: string // VUNGLE_PRIVACY_URL token
}

export interface PublisherDataInterface {
  id: string // PUB_ID token
}

export interface SdkDataInterface {
  timeLoaded?: number; // the time sdk has loaded the ad, unit is milliseconds
  loadTimeout: number; // LOAD_TIMEOUT token, unit is seconds
  version: string // SDK_VERSION token
  is: {
    v70x: boolean // src/services/store-kit-product-view/store-kit-product-view-service-resolver.ts
    v740: boolean // src/services/mute/util/init-start-muted-state.ts
    v71xOrAbove: boolean // src/services/store-kit-product-view/store-kit-product-view-service-resolver.ts
    v741OrAbove: boolean // src/services/mute/util/init-start-muted-state.ts
    v744OrAbove: boolean // src/components/ad/reporting/tpat-event-handler.ts
    v760OrAbove: boolean // src/services/bootstrap/wait-for-ready-to-play.ts
    below721: boolean // src/services/store-kit-product-view/store-kit-product-view-service-resolver.ts
    below7: boolean // src/services/store-kit-product-view/util/should-not-show-store-view.ts
    below71x: boolean // src/services/store-kit-product-view/util/should-not-show-store-view.ts
  },
  supports: {
    hlsCustomPlayer: boolean // src/components/video/player/hls-service.ts
    omSdk: boolean // src/services/bootstrap/load-omsdk-files.ts
    openPrivacy: boolean // src/components/privacy/get-ad-machine-privacy-actions.ts
    orientationProperties: boolean // src/services/proxy-mraid/util/supports-orientation-properties.ts
    pingUrl: boolean // src/services/network-request/init-network-request-service.ts
    rewardGranted: boolean // src/components/ad/reporting/tpat-event-handler.ts
    silent: boolean // src/services/mute/util/init-start-muted-state.ts
    sko: boolean
    skpv: boolean
    aak: boolean
    videoLength: boolean // src/components/ad/reporting/tpat-event-handler.ts
  }
}

export interface AdDataInterface {
  advertiser: AdvertiserDataInterface
  device: DeviceDataInterface
  gdpr: GdprDataInterface
  incentivized: IncentivizedDataInterface
  placement: PlacementDataInterface
  platform: PlatformDataInterface
  publisher: PublisherDataInterface
  sdk: SdkDataInterface
}

export type AdDataReadonlyInterface = DeepReadonly<AdDataInterface>;

export const defaultAdData: AdDataInterface = {
  advertiser: {
    appStoreId: undefined,
    creative: {
      format: '',
      formatVersion: '',
      id: '',
      type: '',
      is: {
        freeForm: false,
        adPodding: false,
      },
    },
    domain: '',
    dsp: 'others',
    headerBidding: false,
    mediation: '',
    disableEndcardCache: false,
  },
  device: {
    ado: false,
    countryCode: '',
    model: '',
    os: {
      name: 'unknown',
      version: '0.0.0',
      is: {
        iOS: false,
        android: false,
        amazon: false,
        unknown: true,
      },
    },
    skpv: {
      hasMaskIssue: false,
      hasSwipeIssue: false,
    },
    type: '',
  },
  gdpr: {
    accept: '',
    body: '',
    deny: '',
    requiresConsent: false,
    title: '',
  },
  incentivized: {
    body: '',
    close: '',
    continue: '',
    title: '',
  },
  placement: {
    type: 'unknown',
    id: '',
    is: {
      banner: false,
      fullscreen: true,
      inLine: false,
      mrec: false,
      rewarded: false,
    },
  },
  platform: {
    accTests: undefined,
    nautilusVersion: '0.0.0',
    observability: false,
    observedExperiments: '',
    sessionId: '',
    privacyUrl: '',
  },
  publisher: {
    id: '',
  },
  sdk: {
    timeLoaded: undefined,
    loadTimeout: -1,
    version: '0.0.0',
    is: {
      v70x: false,
      v740: false,
      v71xOrAbove: false,
      v741OrAbove: false,
      v744OrAbove: false,
      v760OrAbove: false,
      below721: false,
      below7: false,
      below71x: false,
    },
    supports: {
      hlsCustomPlayer: false,
      omSdk: false,
      openPrivacy: false,
      orientationProperties: false,
      pingUrl: false,
      rewardGranted: false,
      silent: false,
      sko: false,
      skpv: false,
      aak: false,
      videoLength: false,
    },
  }
};

// we can remove the default values once we can fully trust nautilus
const AdContext = createContainerContext<AdDataReadonlyInterface>(defaultAdData, 'AdContext');

export default AdContext;
