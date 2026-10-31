// Answers to the after-sunset question arrive as notification responses: a button
// on the notification sends the answer straight away, a tap on the notification
// itself opens the question page. Also sends answers left over from being offline.
import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';
import { flushFeedback, isAnswered, ratingFromAction, submitFeedback, type FeedbackAsk } from './feedback';
import { useSettings } from './settings';

export function useFeedbackResponses() {
  const response = Notifications.useLastNotificationResponse();
  const router = useRouter();
  const { lang } = useSettings();
  const handled = useRef<string | null>(null);

  useEffect(() => {
    flushFeedback().catch(() => {});
  }, []);

  useEffect(() => {
    if (!response) return;
    const ask = response.notification.request.content.data?.feedbackAsk as FeedbackAsk | undefined;
    // The same response comes back on re-renders; act on each one once.
    const id = `${response.notification.request.identifier}:${response.actionIdentifier}`;
    if (!ask || handled.current === id) return;
    handled.current = id;
    const rating = ratingFromAction(response.actionIdentifier);
    if (rating !== null) submitFeedback(ask, rating, lang).catch(() => {});
    else if (response.actionIdentifier === Notifications.DEFAULT_ACTION_IDENTIFIER)
      isAnswered(ask.key)
        .then((answered) => !answered && router.push({ pathname: '/feedback', params: { ask: JSON.stringify(ask) } }))
        .catch(() => {});
  }, [response, lang, router]);
}
