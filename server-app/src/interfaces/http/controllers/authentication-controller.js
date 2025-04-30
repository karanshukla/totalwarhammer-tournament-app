import User from '../../../domain/models/user.js';
import JwtService from '../../../infrastructure/services/jwt-service.js';

const jwtService = new JwtService();

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    
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

    const token = jwtService.generateToken({
      id: user.id,
      email: user.email
    });
    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        id: user.id,
        email: user.email,
        token 
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
   //Invalidate or token stuff here
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
