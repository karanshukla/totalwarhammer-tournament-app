import User from '../../../domain/models/user.js';
import JwtService from '../../../infrastructure/services/jwt-service.js';

const jwtService = new JwtService();

export const login = async (req, res) => {
  try {
    const { email, password, rememberMe = false } = req.body;
    
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

    // Use rememberMe to determine token type
    const tokenType = rememberMe ? 'rememberMe' : 'standard';
    
    const token = jwtService.generateToken({
      id: user.id,
      email: user.email
    }, tokenType);
    
    // Get token expiration for client reference
    const decoded = jwtService.decodeToken(token);
    const expiresAt = decoded.exp * 1000; // Convert to milliseconds
    
    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        id: user.id,
        email: user.email,
        username: user.username,
        token,
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

export const logout = async (req, res) => {
  try {
   // Client-side token invalidation is handled by the client
   // We don't need server-side invalidation as tokens are stateless
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
