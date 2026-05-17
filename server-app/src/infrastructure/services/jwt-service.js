import jsonwebtoken from "jsonwebtoken";
const { sign, verify, decode } = jsonwebtoken;

class JwtService {
  constructor(config = {}) {
    this.secretKey = config.secretKey || process.env.JWT_SECRET;
    this.defaultExpiresIn =
      config.expiresIn || process.env.JWT_EXPIRES_IN || "1h";

    // Define token expiration times for different user types
    this.tokenExpiration = {
      standard: this.defaultExpiresIn,
      rememberMe: process.env.JWT_REMEMBER_ME_EXPIRES_IN || "30d",
      guest: process.env.JWT_GUEST_EXPIRES_IN || "48h",
    };

    if (!this.secretKey) {
      throw new Error("JWT secret key is required");
    }
  }

  /**
   * @param {string} token
   * @returns {import('jsonwebtoken').JwtPayload | string | null}
   */
  decodeToken(token) {
    return decode(token);
  }

  /**
   * @param {object} payload
   * @param {'standard' | 'rememberMe' | 'guest'} [tokenType]
   * @returns {string}
   */
  generateToken(payload, tokenType = "standard") {
    const expiresIn = this.tokenExpiration[tokenType] || this.defaultExpiresIn;
    if (!expiresIn) {
      throw new Error(
        `No expiration time defined for token type: ${tokenType}`,
      );
    }
    const enhancedPayload = {
      ...payload,
      tokenType,
    };

    return sign(enhancedPayload, this.secretKey, { expiresIn });
  }

  /**
   * @param {string} token
   * @returns {import('jsonwebtoken').JwtPayload | string}
   */
  verifyToken(token) {
    return verify(token, this.secretKey);
  }

  /**
   * @param {string} token
   * @returns {boolean}
   */
  isTokenExpired(token) {
    const decoded = this.decodeToken(token);
    return decoded.exp < Math.floor(Date.now() / 1000);
  }

  /**
   * @param {string} token
   * @returns {string}
   */
  getTokenType(token) {
    const decoded = this.decodeToken(token);
    return decoded.tokenType || "standard";
  }
}

export default JwtService;
