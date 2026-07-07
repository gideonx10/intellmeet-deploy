import { deleteCache } from './cache.js';

export const meetingCacheKey = (id) => `meeting:${id}`;

export const invalidateMeetingCache = (id) => deleteCache(meetingCacheKey(id));
