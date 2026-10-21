import { MatomoInitializerService } from 'ngx-matomo-client';
import { AppInitService } from './services/app-init.service'; // Adjust path as necessary
import { GoogleTagManagerService } from './services/google-tag-manager.service';

export function appConfigFactory(
  appInitService: AppInitService,
  matomoInitializer: MatomoInitializerService,
  googleTagManager: GoogleTagManagerService
): () => Promise<any> {
  return () => {
    return appInitService.init().then(conf => {
      googleTagManager.init(conf.googleTagManagerId);

      // Matomo is optional: without a site id and tracker URL the deferred tracker is never
      // initialized, instead of fetching matomo.js from the app's own origin.
      const matomoId = `${conf.matomoId ?? ''}`.trim();
      const matomoUrl = `${conf.matomoUrl ?? ''}`.trim();
      if (matomoId && matomoUrl) {
        matomoInitializer.initializeTracker({ siteId: matomoId, trackerUrl: matomoUrl });
      }
    });
  }
}
