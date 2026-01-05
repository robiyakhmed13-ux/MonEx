// Authentication service for Supabase
import { supabase } from '@/integrations/supabase/client';
import { User, AuthError, Session } from '@supabase/supabase-js';

export interface AuthResponse {
  success: boolean;
  user?: User;
  session?: Session;
  error?: string;
}

export interface VerificationResponse {
  success: boolean;
  error?: string;
}

export class AuthService {
  // Register new user with email/password
  static async register(email: string, password: string, fullName: string): Promise<AuthResponse> {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        }
      });

      if (error) {
        return { success: false, error: error.message };
      }

      if (!data.user) {
        return { success: false, error: 'Registration failed' };
      }

      // Create user profile
      await this.createUserProfile(data.user.id, fullName, email);

      return {
        success: true,
        user: data.user,
        session: data.session || undefined
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Login with email/password
  static async login(email: string, password: string): Promise<AuthResponse> {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        return { success: false, error: error.message };
      }

      return {
        success: true,
        user: data.user,
        session: data.session
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Logout
  static async logout(): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        return { success: false, error: error.message };
      }

      // Clear local storage
      localStorage.clear();

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Get current user
  static async getCurrentUser(): Promise<User | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      return user;
    } catch (error) {
      console.error('Error getting current user:', error);
      return null;
    }
  }

  // Get current session
  static async getSession(): Promise<Session | null> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      return session;
    } catch (error) {
      console.error('Error getting session:', error);
      return null;
    }
  }

  // Verify email with code (OTP)
  static async verifyEmail(email: string, token: string): Promise<VerificationResponse> {
    try {
      const { error } = await supabase.auth.verifyOtp({
        email,
        token,
        type: 'signup'
      });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Resend verification email
  static async resendVerificationEmail(email: string): Promise<VerificationResponse> {
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email
      });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Reset password - send reset email
  static async sendPasswordResetEmail(email: string): Promise<VerificationResponse> {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Update password
  static async updatePassword(newPassword: string): Promise<VerificationResponse> {
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Update user profile
  static async updateProfile(userId: string, updates: {
    full_name?: string;
    avatar_url?: string;
  }): Promise<VerificationResponse> {
    try {
      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', userId);

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Create user profile (called after registration)
  private static async createUserProfile(userId: string, fullName: string, email: string) {
    try {
      const { error } = await supabase
        .from('profiles')
        .insert({
          id: userId,
          full_name: fullName,
          email: email,
          created_at: new Date().toISOString()
        });

      if (error) {
        console.error('Error creating profile:', error);
      }
    } catch (error) {
      console.error('Error creating profile:', error);
    }
  }

  // Listen for auth changes
  static onAuthStateChange(callback: (user: User | null, session: Session | null) => void) {
    return supabase.auth.onAuthStateChange((event, session) => {
      callback(session?.user || null, session);
    });
  }

  // Check if email is already registered
  static async checkEmailExists(email: string): Promise<boolean> {
    try {
      // Try to sign in with a dummy password - if user exists, we'll get an error
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password: 'dummy-password-check-123'
      });

      // If we get "Invalid login credentials" error, user exists
      if (error && error.message.includes('Invalid login credentials')) {
        return true;
      }

      // If no error (shouldn't happen with dummy password), user exists
      if (data.user) {
        // Sign them out immediately
        await supabase.auth.signOut();
        return true;
      }

      return false;
    } catch (error) {
      console.error('Error checking email:', error);
      return false;
    }
  }

  // Social auth - Google
  static async signInWithGoogle(): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        }
      });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Delete account
  static async deleteAccount(userId: string): Promise<VerificationResponse> {
    try {
      // Delete user data first
      await supabase.from('transactions').delete().eq('user_id', userId);
      await supabase.from('limits').delete().eq('user_id', userId);
      await supabase.from('goals').delete().eq('user_id', userId);
      await supabase.from('profiles').delete().eq('id', userId);

      // Then delete auth account (requires admin privileges)
      // This should be done via Edge Function for security
      
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}

// Export convenience functions
export const auth = {
  register: AuthService.register,
  login: AuthService.login,
  logout: AuthService.logout,
  getCurrentUser: AuthService.getCurrentUser,
  getSession: AuthService.getSession,
  verifyEmail: AuthService.verifyEmail,
  resendVerification: AuthService.resendVerificationEmail,
  resetPassword: AuthService.sendPasswordResetEmail,
  updatePassword: AuthService.updatePassword,
  updateProfile: AuthService.updateProfile,
  onAuthStateChange: AuthService.onAuthStateChange,
  checkEmailExists: AuthService.checkEmailExists,
  signInWithGoogle: AuthService.signInWithGoogle,
  deleteAccount: AuthService.deleteAccount,
};
