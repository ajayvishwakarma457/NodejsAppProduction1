import passport from 'passport';
import { Strategy as GoogleStrategy, VerifyCallback } from 'passport-google-oauth20';
import { Strategy as GitHubStrategy } from 'passport-github2';
import { env } from './env';
import { logger } from './logger';

export interface OAuthProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  avatar: string | null;
  provider: 'google' | 'github';
  role?: string;
}

const parseGoogleProfile = (
  accessToken: string,
  refreshToken: string,
  profile: passport.Profile,
  done: VerifyCallback
): void => {
  try {
    const email = profile.emails?.[0]?.value ?? '';
    const avatar = profile.photos?.[0]?.value ?? null;

    const result: OAuthProfile = {
      id: profile.id,
      email: email.toLowerCase().trim(),
      firstName: profile.name?.givenName || email.split('@')[0] || 'User',
      lastName: profile.name?.familyName || '',
      avatar,
      provider: 'google',
    };

    done(null, result);
  } catch (error) {
    logger.error('Google OAuth profile parsing failed', { error });
    done(error as Error);
  }
};

const parseGitHubProfile = (
  accessToken: string,
  refreshToken: string,
  profile: passport.Profile,
  done: VerifyCallback
): void => {
  try {
    const email = profile.emails?.[0]?.value ?? '';
    const avatar = profile.photos?.[0]?.value ?? null;
    const displayName = profile.displayName || profile.username || email.split('@')[0] || 'User';
    const nameParts = displayName.split(' ');

    const result: OAuthProfile = {
      id: profile.id,
      email: email.toLowerCase().trim(),
      firstName: nameParts[0] || 'User',
      lastName: nameParts.slice(1).join(' ') || '',
      avatar,
      provider: 'github',
    };

    done(null, result);
  } catch (error) {
    logger.error('GitHub OAuth profile parsing failed', { error });
    done(error as Error);
  }
};

export const configurePassport = (): void => {
  if (env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET) {
    passport.use(
      new GoogleStrategy(
        {
          clientID: env.GOOGLE_CLIENT_ID,
          clientSecret: env.GOOGLE_CLIENT_SECRET,
          callbackURL: env.GOOGLE_CALLBACK_URL,
          scope: ['profile', 'email'],
        },
        parseGoogleProfile
      )
    );
    logger.info('Google OAuth strategy configured');
  }

  if (env.GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET) {
    passport.use(
      new GitHubStrategy(
        {
          clientID: env.GITHUB_CLIENT_ID,
          clientSecret: env.GITHUB_CLIENT_SECRET,
          callbackURL: env.GITHUB_CALLBACK_URL,
          scope: ['user:email'],
        },
        parseGitHubProfile
      )
    );
    logger.info('GitHub OAuth strategy configured');
  }
};

export default passport;
