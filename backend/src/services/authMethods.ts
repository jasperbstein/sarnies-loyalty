import { query } from '../db/database';

export interface AuthMethod {
  id: number;
  user_id: number;
  auth_type: 'phone' | 'email' | 'line' | 'password';
  auth_identifier: string;
  is_verified: boolean;
  is_primary: boolean;
  metadata: Record<string, any>;
  created_at: Date;
  updated_at: Date;
}

export interface User {
  id: number;
  name: string;
  email?: string;
  phone?: string;
  line_id?: string;
  [key: string]: any;
}

/**
 * AuthMethodsService provides unified handling for multiple auth methods per user.
 * This service abstracts the user_auth_methods table and provides a clean API
 * for finding, adding, and managing auth methods.
 */
export class AuthMethodsService {
  /**
   * Find a user by any auth method (phone, email, line)
   */
  async findUserByAuthMethod(type: string, identifier: string): Promise<User | null> {
    // First try the new user_auth_methods table
    try {
      const result = await query(
        `SELECT u.* FROM users u
         JOIN user_auth_methods uam ON u.id = uam.user_id
         WHERE uam.auth_type = $1 AND LOWER(uam.auth_identifier) = LOWER($2)`,
        [type, identifier]
      );

      if (result.rows.length > 0) {
        return result.rows[0];
      }
    } catch {
      // Table may not exist yet (pre-Phase 3)
    }

    // Fall back to direct user table lookup
    let sql = '';
    switch (type) {
      case 'phone':
        sql = 'SELECT * FROM users WHERE phone = $1';
        break;
      case 'email':
        sql = 'SELECT * FROM users WHERE LOWER(email) = LOWER($1)';
        break;
      case 'line':
        sql = 'SELECT * FROM users WHERE line_id = $1';
        break;
      default:
        return null;
    }

    const result = await query(sql, [identifier]);
    return result.rows.length > 0 ? result.rows[0] : null;
  }

  /**
   * Add a new auth method to a user
   */
  async addAuthMethod(
    userId: number,
    type: string,
    identifier: string,
    verified: boolean = false,
    metadata: Record<string, any> = {}
  ): Promise<void> {
    // Check if identifier is already used by another user
    const existing = await this.findUserByAuthMethod(type, identifier);
    if (existing && existing.id !== userId) {
      throw new Error(`This ${type} is already linked to another account`);
    }

    // Add to user_auth_methods table
    try {
      await query(
        `INSERT INTO user_auth_methods (user_id, auth_type, auth_identifier, is_verified, metadata)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (auth_type, auth_identifier)
         DO UPDATE SET user_id = $1, is_verified = $4, metadata = $5, updated_at = NOW()`,
        [userId, type, identifier, verified, JSON.stringify(metadata)]
      );
    } catch {
      // Table may not exist yet
    }

    // Also update the users table directly for backwards compatibility
    const updates: { [key: string]: any } = {};
    switch (type) {
      case 'phone':
        updates.phone = identifier;
        updates.phone_verified = verified;
        break;
      case 'email':
        updates.email = identifier.toLowerCase();
        updates.email_verified = verified;
        break;
      case 'line':
        updates.line_id = identifier;
        if (metadata.display_name) updates.line_display_name = metadata.display_name;
        if (metadata.picture_url) updates.line_picture_url = metadata.picture_url;
        break;
    }

    if (Object.keys(updates).length > 0) {
      const setClauses = Object.keys(updates).map((k, i) => `${k} = $${i + 2}`);
      const values = Object.values(updates);

      await query(
        `UPDATE users SET ${setClauses.join(', ')}, updated_at = NOW() WHERE id = $1`,
        [userId, ...values]
      );
    }
  }

  /**
   * Remove an auth method from a user
   */
  async removeAuthMethod(userId: number, type: string): Promise<void> {
    // Check if this is the last auth method
    const methods = await this.getUserAuthMethods(userId);
    const remaining = methods.filter(m => m.auth_type !== type);

    if (remaining.length === 0) {
      throw new Error('Cannot remove last auth method');
    }

    // Remove from user_auth_methods table
    try {
      await query(
        'DELETE FROM user_auth_methods WHERE user_id = $1 AND auth_type = $2',
        [userId, type]
      );
    } catch {
      // Table may not exist yet
    }

    // Also update the users table
    const updates: string[] = [];
    switch (type) {
      case 'phone':
        updates.push('phone = NULL', 'phone_verified = false');
        break;
      case 'email':
        updates.push('email = NULL', 'email_verified = false');
        break;
      case 'line':
        updates.push('line_id = NULL', 'line_display_name = NULL', 'line_picture_url = NULL');
        break;
    }

    if (updates.length > 0) {
      await query(
        `UPDATE users SET ${updates.join(', ')}, updated_at = NOW() WHERE id = $1`,
        [userId]
      );
    }
  }

  /**
   * Set an auth method as primary
   */
  async setAsPrimary(userId: number, type: string): Promise<void> {
    // Verify user has this auth method
    const methods = await this.getUserAuthMethods(userId);
    const hasMethod = methods.some(m => m.auth_type === type);

    if (!hasMethod) {
      throw new Error(`User does not have ${type} auth method`);
    }

    // Update primary in user_auth_methods table
    try {
      await query(
        'UPDATE user_auth_methods SET is_primary = false WHERE user_id = $1',
        [userId]
      );
      await query(
        'UPDATE user_auth_methods SET is_primary = true WHERE user_id = $1 AND auth_type = $2',
        [userId, type]
      );
    } catch {
      // Table may not exist yet
    }

    // Also update users table
    await query(
      'UPDATE users SET primary_auth_method = $1, updated_at = NOW() WHERE id = $2',
      [type, userId]
    );
  }

  /**
   * Get all auth methods for a user
   */
  async getUserAuthMethods(userId: number): Promise<AuthMethod[]> {
    // Try the new table first
    try {
      const result = await query(
        'SELECT * FROM user_auth_methods WHERE user_id = $1 ORDER BY is_primary DESC, created_at ASC',
        [userId]
      );
      if (result.rows.length > 0) {
        return result.rows;
      }
    } catch {
      // Table may not exist yet
    }

    // Fall back to building from users table
    const userResult = await query(
      `SELECT phone, email, line_id, line_display_name, line_picture_url,
              phone_verified, email_verified, primary_auth_method
       FROM users WHERE id = $1`,
      [userId]
    );

    if (userResult.rows.length === 0) {
      return [];
    }

    const user = userResult.rows[0];
    const methods: AuthMethod[] = [];

    if (user.phone && !user.phone.startsWith('LINE') && !user.phone.startsWith('E')) {
      methods.push({
        id: 0,
        user_id: userId,
        auth_type: 'phone',
        auth_identifier: user.phone,
        is_verified: user.phone_verified || false,
        is_primary: user.primary_auth_method === 'phone',
        metadata: {},
        created_at: new Date(),
        updated_at: new Date()
      });
    }

    if (user.email) {
      methods.push({
        id: 0,
        user_id: userId,
        auth_type: 'email',
        auth_identifier: user.email,
        is_verified: user.email_verified || false,
        is_primary: user.primary_auth_method === 'email',
        metadata: {},
        created_at: new Date(),
        updated_at: new Date()
      });
    }

    if (user.line_id) {
      methods.push({
        id: 0,
        user_id: userId,
        auth_type: 'line',
        auth_identifier: user.line_id,
        is_verified: true,
        is_primary: user.primary_auth_method === 'line',
        metadata: {
          display_name: user.line_display_name,
          picture_url: user.line_picture_url
        },
        created_at: new Date(),
        updated_at: new Date()
      });
    }

    return methods;
  }

  /**
   * Check if an identifier is available for linking
   */
  async isIdentifierAvailable(
    type: string,
    identifier: string,
    excludeUserId?: number
  ): Promise<boolean> {
    const existing = await this.findUserByAuthMethod(type, identifier);
    if (!existing) return true;
    if (excludeUserId && existing.id === excludeUserId) return true;
    return false;
  }
}

// Export singleton instance
export const authMethodsService = new AuthMethodsService();
