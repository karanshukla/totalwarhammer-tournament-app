import jsonwebtoken from 'jsonwebtoken';
const { sign, verify, decode } = jsonwebtoken;

class JwtService {
    constructor(config = {}) {
        this.secretKey = config.secretKey || process.env.JWT_SECRET;
        this.expiresIn = config.expiresIn || process.env.JWT_EXPIRES_IN || '1d';
        
        if (!this.secretKey) {
            throw new Error('JWT secret key is required');
        }
    }

    decodeToken(token) {
        try {
            return decode(token);
        } catch (error) {
            throw new Error('Failed to decode token');
        }
    }
    generateToken(payload) {
        try {
            return sign(payload, this.secretKey, { expiresIn: this.expiresIn });
        } catch (error) {
            throw new Error('Failed to generate token');
        }
    }
    verifyToken(token) {
        try {
            return verify(token, this.secretKey);
        } catch (error) {
            throw new Error('Failed to verify token');
        }
    }
    isTokenExpired(token) {
        try {
            const decoded = this.decodeToken(token);
            return decoded.exp < Math.floor(Date.now() / 1000);
        } catch (error) {
            throw new Error('Failed to check token expiration');
        }
    }
}

export default JwtService;