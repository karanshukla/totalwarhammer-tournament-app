import jsonwebtoken from 'jsonwebtoken';
const { sign, verify, decode } = jsonwebtoken;

class JwtService {
    constructor(config = {}) {
        this.secretKey = config.secretKey || process.env.JWT_SECRET;
        this.defaultExpiresIn = config.expiresIn || process.env.JWT_EXPIRES_IN || '1h';
        
        // Define token expiration times for different user types
        this.tokenExpiration = {
            standard: this.defaultExpiresIn,
            rememberMe: process.env.JWT_REMEMBER_ME_EXPIRES_IN || '7d',
            guest: process.env.JWT_GUEST_EXPIRES_IN || '48h'
        };
        
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
    
    generateToken(payload, tokenType = 'standard') {
        try {
            const expiresIn = this.tokenExpiration[tokenType] || this.defaultExpiresIn;
            
            // Add token type to payload
            const enhancedPayload = {
                ...payload,
                tokenType
            };
            
            return sign(enhancedPayload, this.secretKey, { expiresIn });
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
    
    getTokenType(token) {
        try {
            const decoded = this.decodeToken(token);
            return decoded.tokenType || 'standard';
        } catch (error) {
            return 'standard';
        }
    }
}

export default JwtService;