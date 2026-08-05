import { UserRepository } from '../repositories/userRepository.js';
import { UserProfileRepository } from '../repositories/userProfileRepository.js';
import { UserPreferencesRepository } from '../repositories/userPreferencesRepository.js';
import { OAuthRepository } from '../repositories/oauthRepository.js';
import { AvatarStorageService } from './avatarStorageService.js';
import { ValidationError, NotFoundError, ConflictError } from '../utils/errors.js';
import { withTransaction } from '../utils/dbRetry.js';

/**
 * Computes dynamic avatar source without requiring schema changes.
 * Priority: custom (local file) -> google/oauth -> default
 */
export function computeAvatarSource(avatarUrl, oauthAccounts = []) {
  if (avatarUrl && typeof avatarUrl === 'string' && avatarUrl.startsWith('/uploads/avatars/')) {
    return 'custom';
  }
  const googleAccount = oauthAccounts.find(acc => acc.provider === 'google' && acc.metadata?.picture);
  if (avatarUrl && googleAccount && avatarUrl === googleAccount.metadata.picture) {
    return 'google';
  }
  if (avatarUrl && typeof avatarUrl === 'string' && (avatarUrl.includes('googleusercontent.com') || avatarUrl.startsWith('http'))) {
    return 'google';
  }
  return 'default';
}

/**
 * UserProfileService: Handles user profile business logic, personal information enrichment,
 * username uniqueness enforcement, and avatar management.
 */
export const UserProfileService = {
  /**
   * Retrieves enriched profile details combining users core entity, personal information profile,
   * preferences, and computed avatar source.
   */
  async getEnrichedProfile(userId, executor) {
    const user = await UserRepository.findById(userId, executor);
    if (!user) {
      throw new NotFoundError('User account not found.');
    }

    const [profile, preferences, oauthAccounts] = await Promise.all([
      UserProfileRepository.findByUserId(userId, executor),
      UserPreferencesRepository.findByUserId(userId, executor),
      OAuthRepository.findByUser(userId, executor).catch(() => [])
    ]);

    const { password_hash, ...safeUser } = user;
    const avatarSource = computeAvatarSource(user.avatar_url, oauthAccounts);

    return {
      ...safeUser,
      avatar_source: avatarSource,
      profile: profile || {
        first_name: null,
        last_name: null,
        display_name: user.name || null,
        username: null,
        bio: null,
        phone: null,
        address: null,
        country: null,
        state: null,
        city: null,
        postal_code: null,
        timezone: user.timezone || 'UTC',
        language: 'en'
      },
      preferences: preferences || {
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
      }
    };
  },

  /**
   * Updates personal information profile attributes.
   * Validates username uniqueness if username is being changed.
   */
  async updateProfile(userId, data) {
    const {
      name,
      first_name,
      last_name,
      display_name,
      username,
      bio,
      phone,
      address,
      country,
      state,
      city,
      postal_code,
      timezone,
      language
    } = data;

    return await withTransaction(async (executor) => {
      const user = await UserRepository.findById(userId, executor);
      if (!user) {
        throw new NotFoundError('User account not found.');
      }

      // 1. Username uniqueness check
      if (username !== undefined && username !== null && username.trim() !== '') {
        const cleanUsername = username.trim().toLowerCase();
        if (!/^[a-zA-Z0-9_]{3,30}$/.test(cleanUsername)) {
          throw new ValidationError('Username must be 3-30 alphanumeric characters or underscores.');
        }

        const existingWithUsername = await UserProfileRepository.findByUsername(cleanUsername, executor);
        if (existingWithUsername && existingWithUsername.user_id !== userId) {
          throw new ConflictError('Username is already taken by another user.');
        }
      }

      // 2. Update core user entity attributes if provided
      if (name !== undefined || timezone !== undefined) {
        await UserRepository.updateIdentity(
          userId,
          {
            name: name !== undefined ? name.trim() : undefined,
            timezone: timezone !== undefined ? timezone.trim() : undefined
          },
          executor
        );
      }

      // 3. Upsert user_profiles record
      const profilePayload = {};
      if (first_name !== undefined) profilePayload.first_name = first_name ? first_name.trim() : null;
      if (last_name !== undefined) profilePayload.last_name = last_name ? last_name.trim() : null;
      if (display_name !== undefined) profilePayload.display_name = display_name ? display_name.trim() : null;
      if (username !== undefined) profilePayload.username = username ? username.trim().toLowerCase() : null;
      if (bio !== undefined) profilePayload.bio = bio ? bio.trim() : null;
      if (phone !== undefined) profilePayload.phone = phone ? phone.trim() : null;
      if (address !== undefined) profilePayload.address = address ? address.trim() : null;
      if (country !== undefined) profilePayload.country = country ? country.trim() : null;
      if (state !== undefined) profilePayload.state = state ? state.trim() : null;
      if (city !== undefined) profilePayload.city = city ? city.trim() : null;
      if (postal_code !== undefined) profilePayload.postal_code = postal_code ? postal_code.trim() : null;
      if (timezone !== undefined) profilePayload.timezone = timezone ? timezone.trim() : 'UTC';
      if (language !== undefined) profilePayload.language = language ? language.trim() : 'en';

      if (Object.keys(profilePayload).length > 0) {
        await UserProfileRepository.upsertProfile(userId, profilePayload, executor);
      }

      return this.getEnrichedProfile(userId, executor);
    });
  },

  /**
   * Uploads or replaces avatar image file for a user.
   */
  async uploadAvatar(userId, { buffer, mimeType, dataUri }) {
    return await withTransaction(async (executor) => {
      const user = await UserRepository.findById(userId, executor);
      if (!user) {
        throw new NotFoundError('User account not found.');
      }

      let newAvatarUrl;
      if (dataUri) {
        newAvatarUrl = await AvatarStorageService.saveBase64Avatar(dataUri);
      } else if (buffer) {
        newAvatarUrl = await AvatarStorageService.saveAvatarBuffer(buffer, mimeType);
      } else {
        throw new ValidationError('Either image file buffer or base64 dataUri is required.');
      }

      // Cleanup old custom local avatar file if it exists
      if (user.avatar_url) {
        await AvatarStorageService.deleteAvatarFile(user.avatar_url);
      }

      // Persist new avatar URL on users table
      await UserRepository.updateIdentity(userId, { avatar_url: newAvatarUrl }, executor);

      return { avatar_url: newAvatarUrl, avatar_source: 'custom' };
    });
  },

  /**
   * Deletes custom avatar image file. Automatically restores Google OAuth avatar URL if present.
   */
  async deleteAvatar(userId) {
    return await withTransaction(async (executor) => {
      const user = await UserRepository.findById(userId, executor);
      if (!user) {
        throw new NotFoundError('User account not found.');
      }

      if (user.avatar_url) {
        await AvatarStorageService.deleteAvatarFile(user.avatar_url);
      }

      // Check if user has a connected OAuth provider with a profile picture
      const oauthAccounts = await OAuthRepository.findByUser(userId, executor).catch(() => []);
      const googleAccount = oauthAccounts.find(acc => acc.provider === 'google' && acc.metadata?.picture);
      const restoredAvatarUrl = googleAccount?.metadata?.picture || null;
      const restoredSource = restoredAvatarUrl ? 'google' : 'default';

      await UserRepository.updateIdentity(userId, { avatar_url: restoredAvatarUrl }, executor);

      return { avatar_url: restoredAvatarUrl, avatar_source: restoredSource };
    });
  }
};

