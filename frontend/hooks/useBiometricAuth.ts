'use client';

import { useState, useEffect, useCallback } from 'react';

// WebAuthn types
interface PublicKeyCredentialCreationOptionsJSON {
  challenge: string;
  rp: { name: string; id?: string };
  user: { id: string; name: string; displayName: string };
  pubKeyCredParams: { type: 'public-key'; alg: number }[];
  timeout?: number;
  authenticatorSelection?: {
    authenticatorAttachment?: 'platform' | 'cross-platform';
    requireResidentKey?: boolean;
    userVerification?: 'required' | 'preferred' | 'discouraged';
  };
}

interface StoredCredential {
  credentialId: string;
  email: string;
  createdAt: string;
}

const STORAGE_KEY = 'sarnies_biometric_credentials';
const BIOMETRIC_ENABLED_KEY = 'sarnies_biometric_enabled';

export function useBiometricAuth() {
  const [isSupported, setIsSupported] = useState(false);
  const [isEnabled, setIsEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Check if WebAuthn/biometrics is supported
  useEffect(() => {
    const checkSupport = async () => {
      try {
        // Check for WebAuthn support
        const hasWebAuthn = !!(window.PublicKeyCredential);

        if (hasWebAuthn) {
          // Check if platform authenticator (Face ID/Touch ID) is available
          const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
          setIsSupported(available);
        } else {
          setIsSupported(false);
        }

        // Check if user has enabled biometrics
        const enabled = localStorage.getItem(BIOMETRIC_ENABLED_KEY) === 'true';
        setIsEnabled(enabled);
      } catch (error) {
        console.error('Biometric support check failed:', error);
        setIsSupported(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkSupport();
  }, []);

  // Register biometric credential
  const registerBiometric = useCallback(async (email: string, userId: number): Promise<boolean> => {
    if (!isSupported) return false;

    try {
      // Create challenge (in production, this should come from the server)
      const challenge = new Uint8Array(32);
      crypto.getRandomValues(challenge);

      const publicKeyCredentialCreationOptions: PublicKeyCredentialCreationOptions = {
        challenge,
        rp: {
          name: 'Sarnies Loyalty',
          id: window.location.hostname,
        },
        user: {
          id: Uint8Array.from(String(userId), c => c.charCodeAt(0)),
          name: email,
          displayName: email,
        },
        pubKeyCredParams: [
          { type: 'public-key', alg: -7 },  // ES256
          { type: 'public-key', alg: -257 }, // RS256
        ],
        timeout: 60000,
        authenticatorSelection: {
          authenticatorAttachment: 'platform', // Use device biometrics
          requireResidentKey: true,
          userVerification: 'required',
        },
      };

      const credential = await navigator.credentials.create({
        publicKey: publicKeyCredentialCreationOptions,
      }) as PublicKeyCredential;

      if (!credential) return false;

      // Store credential info locally
      const storedCredential: StoredCredential = {
        credentialId: bufferToBase64(credential.rawId),
        email,
        createdAt: new Date().toISOString(),
      };

      localStorage.setItem(STORAGE_KEY, JSON.stringify(storedCredential));
      localStorage.setItem(BIOMETRIC_ENABLED_KEY, 'true');
      setIsEnabled(true);

      return true;
    } catch (error) {
      console.error('Biometric registration failed:', error);
      return false;
    }
  }, [isSupported]);

  // Authenticate with biometrics
  const authenticateWithBiometric = useCallback(async (): Promise<{ success: boolean; email?: string }> => {
    if (!isSupported || !isEnabled) {
      return { success: false };
    }

    try {
      const storedData = localStorage.getItem(STORAGE_KEY);
      if (!storedData) {
        return { success: false };
      }

      const stored: StoredCredential = JSON.parse(storedData);

      // Create challenge
      const challenge = new Uint8Array(32);
      crypto.getRandomValues(challenge);

      const publicKeyCredentialRequestOptions: PublicKeyCredentialRequestOptions = {
        challenge,
        timeout: 60000,
        rpId: window.location.hostname,
        allowCredentials: [{
          type: 'public-key',
          id: base64ToBuffer(stored.credentialId),
          transports: ['internal'],
        }],
        userVerification: 'required',
      };

      const assertion = await navigator.credentials.get({
        publicKey: publicKeyCredentialRequestOptions,
      }) as PublicKeyCredential;

      if (assertion) {
        return { success: true, email: stored.email };
      }

      return { success: false };
    } catch (error) {
      console.error('Biometric authentication failed:', error);
      return { success: false };
    }
  }, [isSupported, isEnabled]);

  // Check if biometrics is set up for a specific email
  const hasCredentialFor = useCallback((email: string): boolean => {
    try {
      const storedData = localStorage.getItem(STORAGE_KEY);
      if (!storedData) return false;
      const stored: StoredCredential = JSON.parse(storedData);
      return stored.email.toLowerCase() === email.toLowerCase();
    } catch {
      return false;
    }
  }, []);

  // Get stored email (if any)
  const getStoredEmail = useCallback((): string | null => {
    try {
      const storedData = localStorage.getItem(STORAGE_KEY);
      if (!storedData) return null;
      const stored: StoredCredential = JSON.parse(storedData);
      return stored.email;
    } catch {
      return null;
    }
  }, []);

  // Disable biometrics
  const disableBiometric = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(BIOMETRIC_ENABLED_KEY);
    setIsEnabled(false);
  }, []);

  return {
    isSupported,
    isEnabled,
    isLoading,
    registerBiometric,
    authenticateWithBiometric,
    hasCredentialFor,
    getStoredEmail,
    disableBiometric,
  };
}

// Helper functions
function bufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}
