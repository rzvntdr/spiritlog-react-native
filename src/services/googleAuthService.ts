// Lazy-load Google Sign-In to avoid crash in Expo Go (no native module)
let GoogleSignin: any = null;
let isSuccessResponse: any = null;
let isNoSavedCredentialFoundResponse: any = null;
let isAvailable = false;

try {
  const mod = require('@react-native-google-signin/google-signin');
  GoogleSignin = mod.GoogleSignin;
  isSuccessResponse = mod.isSuccessResponse;
  isNoSavedCredentialFoundResponse = mod.isNoSavedCredentialFoundResponse;
  GoogleSignin.configure({
    scopes: ['https://www.googleapis.com/auth/drive.appdata'],
  });
  isAvailable = true;
} catch {
  console.warn('Google Sign-In native module not available (Expo Go?)');
}

export function isGoogleSignInAvailable(): boolean {
  return isAvailable;
}

export interface GoogleUser {
  email: string;
  name: string | null;
  photo: string | null;
}

/**
 * Sign in with Google. Returns user info or null if cancelled.
 */
export async function signIn(): Promise<GoogleUser | null> {
  if (!isAvailable) throw new Error('Google Sign-In requires a custom dev build.');

  await GoogleSignin.hasPlayServices();
  const response = await GoogleSignin.signIn();

  if (isSuccessResponse(response)) {
    const { user } = response.data;
    return { email: user.email, name: user.name, photo: user.photo };
  }
  return null;
}

/**
 * Try to sign in silently (restore previous session).
 */
export async function signInSilently(): Promise<GoogleUser | null> {
  if (!isAvailable) return null;

  try {
    const response = await GoogleSignin.signInSilently();
    if (isNoSavedCredentialFoundResponse(response)) return null;
    if (isSuccessResponse(response)) {
      const { user } = response.data;
      return { email: user.email, name: user.name, photo: user.photo };
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Sign out from Google.
 */
export async function signOut(): Promise<void> {
  if (!isAvailable) return;
  try {
    await GoogleSignin.signOut();
  } catch (error) {
    console.warn('Google Sign-Out error:', error);
  }
}

/**
 * Get a fresh access token for API calls.
 */
export async function getAccessToken(): Promise<string | null> {
  if (!isAvailable) return null;
  try {
    const tokens = await GoogleSignin.getTokens();
    return tokens.accessToken;
  } catch (error) {
    console.warn('Failed to get access token:', error);
    return null;
  }
}
