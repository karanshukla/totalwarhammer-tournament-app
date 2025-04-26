// User controller for handling user-related operations
import User from '../../../domain/models/user.js';

// Register a new user
export const register = async (req, res) => {
  try {
    const { username, email, password } = req.body;
    
    // Create new user
    const newUser = await User.create({
      username,
      email,
      password
    });
    
    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        id: newUser.id,
        username: newUser.username,
        email: newUser.email
      }
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to register user',
      error: error.message
    });
  }
};