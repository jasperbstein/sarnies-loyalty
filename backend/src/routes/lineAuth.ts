import { Router, Request, Response } from 'express';
import axios from 'axios';
import crypto from 'crypto';
import { query } from '../db/database';
import { generateToken, REMEMBER_ME_DURATIONS, RememberMeDuration } from '../utils/jwt';
import { handleAndLogError, getUserFriendlyMessage } from '../utils/errorMessages';

const router = Router();

// LINE OAuth configuration
const LINE_CHANNEL_ID = process.env.LINE_CHANNEL_ID;
const LINE_CHANNEL_SECRET = process.env.LINE_CHANNEL_SECRET;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3001';

// =============================================================================
// LINE MESSAGING API WEBHOOK (for bot integration)
// =============================================================================

/**
 * LINE Messaging API Webhook endpoint
 * Handles POST requests from LINE platform for messaging events
 *
 * Note: Signature verification requires the raw request body and the
 * Channel Secret (not the Channel Access Token). For now, we accept
 * all requests and log them. In production, implement proper verification.
 */
router.post('/webhook', (req: Request, res: Response) => {
  // Log webhook events (for debugging)
  const events = req.body?.events || [];
  console.log(`🟢 LINE Webhook: Received ${events.length} events`);

  for (const event of events) {
    console.log(`   - ${event.type}: ${event.source?.userId || 'unknown'}`);
  }

  // LINE requires 200 response - must respond quickly
  res.status(200).json({ status: 'ok' });
});

interface LineTokenResponse {
  access_token: string;
  token_type: string;
  refresh_token: string;
  expires_in: number;
  scope: string;
  id_token?: string;
}

interface LineProfile {
  userId: string;
  displayName: string;
  pictureUrl?: string;
  statusMessage?: string;
}

// =============================================================================
// LINE LOGIN - OAuth Flow
// =============================================================================

/**
 * Generate LINE Login authorization URL
 * Frontend redirects user to this URL to start LINE OAuth
 *
 * Query params:
 * - remember_me: Token expiry duration
 * - ref: Referral code
 * - company: Company invite code (for company registration flow)
 * - link_user_id: If provided, will link LINE to this existing user (for account linking)
 */
router.get('/auth-url', (req: Request, res: Response) => {
  try {
    if (!LINE_CHANNEL_ID) {
      return res.status(500).json({
        error: 'line_not_configured',
        message: 'LINE Login is not configured on this server.'
      });
    }

    const { remember_me, ref, company, link_user_id } = req.query;

    // Build state parameter to pass data through OAuth flow
    const stateData: Record<string, any> = {
      remember_me: remember_me || '7d',
      ref: ref || null,
      company: company || null,
      nonce: Math.random().toString(36).substring(2, 15)
    };

    // If link_user_id is provided, include it for account linking
    if (link_user_id) {
      stateData.link_user_id = link_user_id;
    }

    const state = Buffer.from(JSON.stringify(stateData)).toString('base64url');

    const redirectUri = `${FRONTEND_URL}/auth/line/callback`;

    const authUrl = new URL('https://access.line.me/oauth2/v2.1/authorize');
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('client_id', LINE_CHANNEL_ID);
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('state', state);
    authUrl.searchParams.set('scope', 'profile openid');
    authUrl.searchParams.set('bot_prompt', 'normal'); // Optionally add LINE OA friend

    res.json({
      auth_url: authUrl.toString(),
      state: state
    });
  } catch (error) {
    const message = handleAndLogError('LINE auth URL', error, 'Unable to generate LINE login URL.');
    res.status(500).json({
      error: 'line_auth_url_failed',
      message: message
    });
  }
});

/**
 * Exchange authorization code for tokens and authenticate user
 */
router.post('/callback', async (req: Request, res: Response) => {
  try {
    const { code, state } = req.body;

    if (!code) {
      return res.status(400).json({
        error: 'missing_code',
        message: 'Authorization code is required.'
      });
    }

    if (!LINE_CHANNEL_ID || !LINE_CHANNEL_SECRET) {
      return res.status(500).json({
        error: 'line_not_configured',
        message: 'LINE Login is not configured on this server.'
      });
    }

    // Decode state parameter
    let stateData: { remember_me?: string; ref?: string; company?: string } = {};
    try {
      if (state) {
        stateData = JSON.parse(Buffer.from(state, 'base64url').toString());
      }
    } catch {
      // Invalid state, continue without it
    }

    const redirectUri = `${FRONTEND_URL}/auth/line/callback`;

    // Exchange code for access token
    const tokenResponse = await axios.post<LineTokenResponse>(
      'https://api.line.me/oauth2/v2.1/token',
      new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: redirectUri,
        client_id: LINE_CHANNEL_ID,
        client_secret: LINE_CHANNEL_SECRET
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );

    const { access_token } = tokenResponse.data;

    // Get LINE user profile
    const profileResponse = await axios.get<LineProfile>(
      'https://api.line.me/v2/profile',
      {
        headers: {
          Authorization: `Bearer ${access_token}`
        }
      }
    );

    const lineProfile = profileResponse.data;
    const lineUserId = lineProfile.userId;
    const lineDisplayName = lineProfile.displayName;
    const linePictureUrl = lineProfile.pictureUrl;

    console.log(`🟢 LINE Login: ${lineDisplayName} (${lineUserId})`);

    // Check if user exists with this LINE ID
    let userResult = await query(
      'SELECT * FROM users WHERE line_id = $1',
      [lineUserId]
    );

    let user;
    let needsRegistration = false;
    let accountLinked = false;

    if (userResult.rows.length > 0) {
      // Existing user with LINE - update LINE profile info
      user = userResult.rows[0];

      // Update LINE display name and picture if changed
      await query(
        `UPDATE users
         SET line_display_name = $1, line_picture_url = $2, updated_at = NOW()
         WHERE id = $3`,
        [lineDisplayName, linePictureUrl, user.id]
      );
    } else {
      // LINE ID not found - check if there's a pending link request in state
      // This happens when user clicked "Link LINE" from their profile
      const linkUserId = (stateData as any).link_user_id;

      if (linkUserId) {
        // User wants to link LINE to existing account
        const existingUserResult = await query(
          'SELECT * FROM users WHERE id = $1',
          [linkUserId]
        );

        if (existingUserResult.rows.length > 0) {
          // Link LINE to existing account
          await query(
            `UPDATE users
             SET line_id = $1, line_display_name = $2, line_picture_url = $3, updated_at = NOW()
             WHERE id = $4`,
            [lineUserId, lineDisplayName, linePictureUrl, linkUserId]
          );
          user = existingUserResult.rows[0];
          user.line_id = lineUserId;
          user.line_display_name = lineDisplayName;
          user.line_picture_url = linePictureUrl;
          accountLinked = true;
          console.log(`🔗 Linked LINE to existing user ${linkUserId}`);
        }
      }

      if (!user) {
        // Create new user with LINE info
        // No placeholder phone - LINE users can add real phone later
        const insertResult = await query(
          `INSERT INTO users (
            name, line_id, line_display_name, line_picture_url,
            registration_completed, user_type, primary_auth_method
          ) VALUES ($1, $2, $3, $4, false, 'customer', 'line')
          RETURNING *`,
          [lineDisplayName, lineUserId, lineDisplayName, linePictureUrl]
        );

        user = insertResult.rows[0];
        needsRegistration = true;
      }
    }

    // Determine token expiry based on remember_me setting
    const rememberMe = stateData.remember_me as RememberMeDuration;
    const expiresIn = rememberMe && REMEMBER_ME_DURATIONS[rememberMe]
      ? rememberMe
      : undefined;

    // Generate JWT token
    const jwtToken = generateToken({
      id: user.id,
      line_id: lineUserId,
      type: 'customer'
    }, expiresIn);

    res.json({
      token: jwtToken,
      user: {
        id: user.id,
        name: user.name,
        surname: user.surname,
        phone: user.phone,
        email: user.email,
        birthday: user.birthday,
        gender: user.gender,
        company: user.company,
        points_balance: user.points_balance,
        user_type: user.user_type || 'customer',
        customer_id: user.customer_id,
        company_id: user.company_id,
        is_company_verified: user.is_company_verified,
        created_at: user.created_at,
        registration_completed: user.registration_completed || false,
        line_display_name: lineDisplayName,
        line_picture_url: linePictureUrl,
        type: 'customer'
      },
      needs_registration: needsRegistration || !user.registration_completed,
      account_linked: accountLinked,
      referral_code: stateData.ref,
      company_invite_code: stateData.company,
      remember_me: expiresIn || '7d'
    });
  } catch (error: any) {
    console.error('LINE callback error:', error.response?.data || error.message);

    // Handle specific LINE API errors
    if (error.response?.status === 400) {
      return res.status(400).json({
        error: 'line_auth_failed',
        message: 'LINE authentication failed. Please try again.'
      });
    }

    const message = handleAndLogError('LINE callback', error, 'Unable to complete LINE login.');
    res.status(500).json({
      error: 'line_callback_failed',
      message: message
    });
  }
});

/**
 * Link existing account with LINE
 * Requires authenticated user
 */
router.post('/link', async (req: Request, res: Response) => {
  try {
    const { code, user_id } = req.body;

    if (!code || !user_id) {
      return res.status(400).json({
        error: 'missing_fields',
        message: 'Authorization code and user ID are required.'
      });
    }

    if (!LINE_CHANNEL_ID || !LINE_CHANNEL_SECRET) {
      return res.status(500).json({
        error: 'line_not_configured',
        message: 'LINE Login is not configured on this server.'
      });
    }

    const redirectUri = `${FRONTEND_URL}/auth/line/callback`;

    // Exchange code for access token
    const tokenResponse = await axios.post<LineTokenResponse>(
      'https://api.line.me/oauth2/v2.1/token',
      new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: redirectUri,
        client_id: LINE_CHANNEL_ID,
        client_secret: LINE_CHANNEL_SECRET
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );

    const { access_token } = tokenResponse.data;

    // Get LINE user profile
    const profileResponse = await axios.get<LineProfile>(
      'https://api.line.me/v2/profile',
      {
        headers: {
          Authorization: `Bearer ${access_token}`
        }
      }
    );

    const lineProfile = profileResponse.data;

    // Check if this LINE ID is already linked to another account
    const existingLink = await query(
      'SELECT id FROM users WHERE line_id = $1 AND id != $2',
      [lineProfile.userId, user_id]
    );

    if (existingLink.rows.length > 0) {
      return res.status(400).json({
        error: 'line_already_linked',
        message: 'This LINE account is already linked to another user.'
      });
    }

    // Link LINE to user account
    await query(
      `UPDATE users
       SET line_id = $1, line_display_name = $2, line_picture_url = $3, updated_at = NOW()
       WHERE id = $4`,
      [lineProfile.userId, lineProfile.displayName, lineProfile.pictureUrl, user_id]
    );

    res.json({
      message: 'LINE account linked successfully',
      line_display_name: lineProfile.displayName,
      line_picture_url: lineProfile.pictureUrl
    });
  } catch (error: any) {
    const message = handleAndLogError('LINE link', error, 'Unable to link LINE account.');
    res.status(500).json({
      error: 'line_link_failed',
      message: message
    });
  }
});

/**
 * Unlink LINE from user account
 */
router.post('/unlink', async (req: Request, res: Response) => {
  try {
    const { user_id } = req.body;

    if (!user_id) {
      return res.status(400).json({
        error: 'missing_user_id',
        message: 'User ID is required.'
      });
    }

    // Check if user has other auth methods (phone or email)
    const userResult = await query(
      'SELECT phone, email FROM users WHERE id = $1',
      [user_id]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({
        error: 'user_not_found',
        message: 'User not found.'
      });
    }

    const user = userResult.rows[0];
    const hasPhone = user.phone && !user.phone.startsWith('LINE') && !user.phone.startsWith('E');
    const hasEmail = user.email && !user.email.startsWith('LINE');

    if (!hasPhone && !hasEmail) {
      return res.status(400).json({
        error: 'cannot_unlink',
        message: 'Cannot unlink LINE. Please add a phone number or email first.'
      });
    }

    // Unlink LINE
    await query(
      `UPDATE users
       SET line_id = NULL, line_display_name = NULL, line_picture_url = NULL, updated_at = NOW()
       WHERE id = $1`,
      [user_id]
    );

    res.json({
      message: 'LINE account unlinked successfully'
    });
  } catch (error) {
    const message = handleAndLogError('LINE unlink', error, 'Unable to unlink LINE account.');
    res.status(500).json({
      error: 'line_unlink_failed',
      message: message
    });
  }
});

export default router;
