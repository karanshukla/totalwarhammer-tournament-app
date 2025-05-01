import User from '../../../domain/models/user.js';
import JwtService from '../../../infrastructure/services/jwt-service.js';
import crypto from 'crypto';

const jwtService = new JwtService();

// In-memory store for authorization codes (in production, use Redis or another solution)
const authorizationCodes = new Map();

export const login = async (req, res) => {
  try {
    const { email, password, rememberMe = false, codeChallenge, codeChallengeMethod, state } = req.body;
    
    const user = await User
      .findOne({ email })
      .select('+password');
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }
    const isPasswordValid = await user.validatePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // If PKCE is being used (codeChallenge is provided)
    if (codeChallenge) {
      if (codeChallengeMethod !== 'S256') {
        return res.status(400).json({
          success: false,
          message: 'Only S256 code challenge method is supported'
        });
      }

      // Generate an authorization code
      const authorizationCode = generateAuthCode();
      
      // Store the authorization code with associated code challenge
      authorizationCodes.set(authorizationCode, {
        userId: user.id,
        codeChallenge,
        codeChallengeMethod,
        createdAt: Date.now(),
        used: false
      });

      // Return authorization code instead of directly providing a token
      return res.status(200).json({
        success: true,
        message: 'Authorization code generated',
        data: {
          id: user.id,
          email: user.email,
          username: user.username,
          authorizationCode,
          state // Echo state back for verification
        }
      });
    }

    // Legacy flow (no PKCE)
    // Use rememberMe to determine token type
    const tokenType = rememberMe ? 'rememberMe' : 'standard';
    
    const token = jwtService.generateToken({
      id: user.id,
      email: user.email
    }, tokenType);
    

    const decoded = jwtService.decodeToken(token);
    const expiresAt = decoded.exp * 1000; // Convert to milliseconds
    
    const maxAge = expiresAt - Date.now();
    res.cookie('jwt', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production', // Use secure in production
      sameSite: 'strict',
      maxAge,
      path: '/'
    });
    
    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        id: user.id,
        email: user.email,
        username: user.username,
        expiresAt
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to login',
      error: error.message
    });
  }
}

// New token endpoint for PKCE code exchange
export const token = async (req, res) => {
  try {
    const { grant_type, code, code_verifier } = req.body;

    if (grant_type !== 'authorization_code') {
      return res.status(400).json({
        success: false,
        message: 'Invalid grant type'
      });
    }

    // Check if the authorization code exists and is valid
    const codeData = authorizationCodes.get(code);
    if (!codeData) {
      return res.status(400).json({
        success: false,
        message: 'Invalid authorization code'
      });
    }

    // Check if the code has been used before
    if (codeData.used) {
      // Delete the code and reject the request (potential replay attack)
      authorizationCodes.delete(code);
      return res.status(400).json({
        success: false,
        message: 'Authorization code has already been used'
      });
    }

    // Check if the code has expired (codes valid for 5 minutes)
    const now = Date.now();
    if (now - codeData.createdAt > 5 * 60 * 1000) {
      authorizationCodes.delete(code);
      return res.status(400).json({
        success: false,
        message: 'Authorization code has expired'
      });
    }

    // Verify the code_verifier by generating a code challenge from it
    const codeChallenge = generateCodeChallenge(code_verifier);
    if (codeChallenge !== codeData.codeChallenge) {
      return res.status(400).json({
        success: false,
        message: 'Code verifier does not match code challenge'
      });
    }

    // Mark the code as used
    codeData.used = true;

    // Retrieve the user
    const user = await User.findById(codeData.userId);
    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'User not found'
      });
    }

    // Generate and send the JWT token
    const token = jwtService.generateToken({
      id: user.id,
      email: user.email
    }, 'standard');

    const decoded = jwtService.decodeToken(token);
    const expiresAt = decoded.exp * 1000;

    const maxAge = expiresAt - Date.now();
    res.cookie('jwt', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge,
      path: '/'
    });

    return res.status(200).json({
      success: true,
      message: 'Token issued successfully',
      data: {
        id: user.id,
        email: user.email,
        username: user.username,
        expiresAt
      }
    });
  } catch (error) {
    console.error('Token exchange error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to exchange token',
      error: error.message
    });
  }
}

export const logout = async (req, res) => {
  try {
    res.clearCookie('jwt', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/'
    });
    
    res.status(200).json({
      success: true,
      message: 'Logout successful'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to logout',
      error: error.message
    });
  }
}

// Helper function to generate random authorization code
function generateAuthCode() {
  return crypto.randomBytes(24).toString('hex');
}

// Helper function to generate code challenge from code verifier (S256 method)
function generateCodeChallenge(codeVerifier) {
  const hash = crypto.createHash('sha256')
    .update(codeVerifier)
    .digest('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
  
  return hash;
}
