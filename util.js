const crypto = require('crypto');

module.exports = {
    generateUUID: () => {
    const bytes = crypto.randomBytes(16);
    bytes[6] = (bytes[6] & 0x0f) | 0x40; // Version 4
    bytes[8] = (bytes[8] & 0x3f) | 0x80; // Variant 10

    return bytes.toString('hex');
    }
}
