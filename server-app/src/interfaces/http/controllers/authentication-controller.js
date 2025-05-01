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
