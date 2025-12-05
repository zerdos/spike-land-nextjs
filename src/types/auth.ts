/**
 * Authentication type definitions
 *
 * Core types for authentication-related data structures used throughout the application.
 * These types define the shape of user data, session information, and authentication states.
 */

/**
 * User authentication data
 *
 * Represents a user entity in the authentication system.
 * All fields except id are optional to handle various authentication providers
 * and partial user data scenarios.
 */
export interface User {
  /** Unique identifier for the user */
  id: string;
  /** User's display name */
  name?: string | null;
  /** User's email address */
  email?: string | null;
  /** URL to user's profile image */
  image?: string | null;
}

/**
 * Authentication session data
 *
 * Represents an active user session with authentication state.
 * Contains the authenticated user's information and session metadata.
 */
export interface Session {
  /** Authenticated user information */
  user: User;
  /** Session expiration timestamp */
  expires: string;
}

/**
 * Authentication provider configuration
 *
 * Defines the structure for authentication provider settings.
 */
export interface AuthProvider {
  /** Provider identifier (e.g., 'google', 'github') */
  id: string;
  /** Provider display name */
  name: string;
  /** Provider type (e.g., 'oauth', 'credentials') */
  type: string;
}

/**
 * Authentication state
 *
 * Represents the current authentication state of the application.
 */
export type AuthStatus = "authenticated" | "unauthenticated" | "loading";

/**
 * Authentication error types
 *
 * Defines possible authentication error scenarios.
 */
export type AuthError =
  | "Configuration"
  | "AccessDenied"
  | "Verification"
  | "Default"
  | "OAuthSignin"
  | "OAuthCallback"
  | "OAuthCreateAccount"
  | "EmailCreateAccount"
  | "Callback"
  | "OAuthAccountNotLinked"
  | "EmailSignin"
  | "CredentialsSignin"
  | "SessionRequired";
