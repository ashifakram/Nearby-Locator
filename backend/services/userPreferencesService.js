import { UserPreferencesRepository } from '../repositories/userPreferencesRepository.js';
import { UserRepository } from '../repositories/userRepository.js';
import { NotFoundError } from '../utils/errors.js';
import { withTransaction } from '../utils/dbRetry.js';

/**
 * UserPreferencesService: Business logic layer for preferences, privacy settings, and notification choices.
 */
export const UserPreferencesService = {
  /**
   * Retrieves preferences record for a user.
   */
  async getPreferences(userId, executor) {
    const user = await UserRepository.findById(userId, executor);
    if (!user) {
      throw new NotFoundError('User account not found.');
    }

    const prefs = await UserPreferencesRepository.findByUserId(userId, executor);
    return prefs || {
      theme: 'system',
      language: 'en',
      timezone: user.timezone || 'UTC',
      search_preferences: {},
      ai_preferences: {},
      privacy_settings: {
        profile_visibility: 'private',
        recommendation_preferences: {},
        marketing_preferences: { email: false, in_app: true }
      },
      notification_settings: {
        email_notifications: { marketing: false, security: true, updates: true },
        in_app_notifications: { mentions: true, activity: true },
        security_alerts: true
      }
    };
  },

  /**
   * Updates general user preferences (theme, language, timezone, search, AI).
   */
  async updatePreferences(userId, data) {
    return await withTransaction(async (executor) => {
      const current = await this.getPreferences(userId, executor);

      const payload = {
        theme: data.theme !== undefined ? data.theme : current.theme,
        language: data.language !== undefined ? data.language : current.language,
        timezone: data.timezone !== undefined ? data.timezone : current.timezone,
        search_preferences: data.search_preferences ? { ...current.search_preferences, ...data.search_preferences } : current.search_preferences,
        ai_preferences: data.ai_preferences ? { ...current.ai_preferences, ...data.ai_preferences } : current.ai_preferences
      };

      return await UserPreferencesRepository.upsertPreferences(userId, payload, executor);
    });
  },

  /**
   * Retrieves privacy settings.
   */
  async getPrivacy(userId) {
    const prefs = await this.getPreferences(userId);
    return prefs.privacy_settings;
  },

  /**
   * Updates privacy settings.
   */
  async updatePrivacy(userId, privacySettings) {
    return await withTransaction(async (executor) => {
      const current = await this.getPreferences(userId, executor);
      const updatedPrivacy = {
        ...current.privacy_settings,
        ...privacySettings
      };

      await UserPreferencesRepository.upsertPreferences(userId, { privacy_settings: updatedPrivacy }, executor);
      return updatedPrivacy;
    });
  },

  /**
   * Retrieves notification settings.
   */
  async getNotificationSettings(userId) {
    const prefs = await this.getPreferences(userId);
    return prefs.notification_settings;
  },

  /**
   * Updates notification settings.
   */
  async updateNotificationSettings(userId, notificationSettings) {
    return await withTransaction(async (executor) => {
      const current = await this.getPreferences(userId, executor);
      const updatedNotifications = {
        ...current.notification_settings,
        ...notificationSettings
      };

      await UserPreferencesRepository.upsertPreferences(userId, { notification_settings: updatedNotifications }, executor);
      return updatedNotifications;
    });
  }
};
