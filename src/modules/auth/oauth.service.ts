import { OAuthProfile } from '../../config/passport';
import { tokenService } from '../../services/token.service';
import { userRepository } from '../users/user.repository';
import { authRepository } from './auth.repository';
import { sanitizeAuthUser } from './auth.utils';
import { AuthResult } from './auth.service';

export const oauthService = {
  /**
   * Handle OAuth login or registration.
   * If a user with the same email exists (local or other provider), link the OAuth account.
   * Otherwise, create a new user.
   */
  async handleOAuth(profile: OAuthProfile): Promise<AuthResult> {
    // 1. Try to find existing user by provider + providerId
    let user = await userRepository.findByProvider(profile.provider, profile.id);

    if (user) {
      // Existing OAuth user — update avatar if changed, generate tokens
      if (profile.avatar && user.avatar !== profile.avatar) {
        await authRepository.updateById(String((user as Record<string, unknown>)._id), {
          avatar: profile.avatar,
        });
      }
      await authRepository.updateLastLogin(String((user as Record<string, unknown>)._id));
      const tokens = await tokenService.generateTokenPair(
        String((user as Record<string, unknown>)._id),
        String(user.email),
        String(user.role)
      );
      return { user: sanitizeAuthUser(user), tokens };
    }

    // 2. Try to find existing user by email (link OAuth to local account)
    user = await userRepository.findByEmail(profile.email);

    if (user) {
      // Link OAuth provider to existing account
      await authRepository.updateById(String((user as Record<string, unknown>)._id), {
        provider: profile.provider,
        providerId: profile.id,
        avatar: profile.avatar || user.avatar,
      });

      const updatedUser = await userRepository.findById(
        String((user as Record<string, unknown>)._id)
      );
      if (!updatedUser) {
        throw new Error('Failed to link OAuth account');
      }

      await authRepository.updateLastLogin(String((updatedUser as Record<string, unknown>)._id));
      const tokens = await tokenService.generateTokenPair(
        String((updatedUser as Record<string, unknown>)._id),
        String(updatedUser.email),
        String(updatedUser.role)
      );
      return { user: sanitizeAuthUser(updatedUser), tokens };
    }

    // 3. Create new OAuth user
    const newUser = await authRepository.create({
      firstName: profile.firstName,
      lastName: profile.lastName,
      email: profile.email,
      avatar: profile.avatar,
      provider: profile.provider,
      providerId: profile.id,
      isVerified: true, // OAuth emails are pre-verified
    });

    const tokens = await tokenService.generateTokenPair(
      String((newUser as Record<string, unknown>)._id),
      profile.email,
      String(newUser.role)
    );

    return { user: sanitizeAuthUser(newUser), tokens };
  },
};
