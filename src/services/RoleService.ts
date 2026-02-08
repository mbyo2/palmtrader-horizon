import { supabase } from "@/integrations/supabase/client";

export type AppRole = 'admin' | 'moderator' | 'user' | 'premium';

export class RoleService {
  /**
   * Check if the current user has a specific role
   * Uses the secure has_role function in the database
   */
  static async hasRole(role: AppRole): Promise<boolean> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      const { data, error } = await supabase
        .rpc('has_role', { _user_id: user.id, _role: role });

      if (error) {
        console.error('Error checking role:', error);
        return false;
      }

      return data === true;
    } catch (error) {
      console.error('Error in hasRole:', error);
      return false;
    }
  }

  /**
   * Check if the current user is an admin
   * Uses the secure is_admin function in the database
   */
  static async isAdmin(): Promise<boolean> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      const { data, error } = await supabase
        .rpc('is_admin', { _user_id: user.id });

      if (error) {
        console.error('Error checking admin status:', error);
        return false;
      }

      return data === true;
    } catch (error) {
      console.error('Error in isAdmin:', error);
      return false;
    }
  }

  /**
   * Get all roles for the current user
   */
  static async getUserRoles(): Promise<AppRole[]> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id);

      if (error) {
        console.error('Error fetching user roles:', error);
        return ['user'];
      }

      return data?.map(r => r.role as AppRole) || ['user'];
    } catch (error) {
      console.error('Error in getUserRoles:', error);
      return ['user'];
    }
  }

  /**
   * Assign a role to a user (admin only)
   */
  static async assignRole(userId: string, role: AppRole): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('user_roles')
        .insert({ user_id: userId, role });

      if (error) {
        console.error('Error assigning role:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in assignRole:', error);
      return false;
    }
  }

  /**
   * Remove a role from a user (admin only)
   */
  static async removeRole(userId: string, role: AppRole): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId)
        .eq('role', role);

      if (error) {
        console.error('Error removing role:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in removeRole:', error);
      return false;
    }
  }
}
