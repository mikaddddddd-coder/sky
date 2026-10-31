// Refreshes the forecast while the app is closed, so a 火烧云 that firms up during
// the day still gets its alert without the app being opened. The system decides
// when this actually runs (often every few hours, more when the app is used a lot);
// opening the app always refreshes as well.
import * as BackgroundTask from 'expo-background-task';
import * as Notifications from 'expo-notifications';
import * as TaskManager from 'expo-task-manager';
import { translate } from './i18n/strings';
import { scheduleTonightAlerts } from './notifications';
import { citiesFor, cityKeyFor, saveReport } from './report';
import { loadSettings, resolveLang } from './settings';
import { buildTonightReport } from './sky/report';

const TASK = 'skywatch.refresh';
// A floor, not a schedule: iOS stretches it as it sees fit.
const EVERY_MINUTES = 120;

// Must be defined when the bundle loads, before any screen, so a background launch finds it.
TaskManager.defineTask(TASK, async () => {
  try {
    const settings = await loadSettings();
    const { alerts } = settings;
    if (!alerts.glow && !alerts.sky && !alerts.typhoon && alerts.feedback === false) return BackgroundTask.BackgroundTaskResult.Success;
    // Never ask for permission from the background; there is no one to answer.
    if (!(await Notifications.getPermissionsAsync()).granted) return BackgroundTask.BackgroundTaskResult.Success;
    const cities = citiesFor(settings);
    if (!cities.length) return BackgroundTask.BackgroundTaskResult.Success;
    const report = await buildTonightReport(cities, new Date(), { fresh: true });
    await saveReport(cityKeyFor(cities), report);
    const lang = resolveLang(settings);
    await scheduleTonightAlerts(report, settings, lang, (key, vars) => translate(lang, key, vars));
    return BackgroundTask.BackgroundTaskResult.Success;
  } catch {
    return BackgroundTask.BackgroundTaskResult.Failed;
  }
});

/** Keeps the refresh registered while any alert is on, and drops it when none are. */
export async function syncBackgroundRefresh(wanted: boolean) {
  try {
    if ((await BackgroundTask.getStatusAsync()) !== BackgroundTask.BackgroundTaskStatus.Available) return;
    const registered = await TaskManager.isTaskRegisteredAsync(TASK);
    if (wanted && !registered) await BackgroundTask.registerTaskAsync(TASK, { minimumInterval: EVERY_MINUTES });
    if (!wanted && registered) await BackgroundTask.unregisterTaskAsync(TASK);
  } catch {
    // Not available here (web, or a build without the module): alerts still come from opening the app.
  }
}
