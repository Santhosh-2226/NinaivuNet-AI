const crypto = require("crypto");
const fs = require("fs");

const ALGORITHM = "aes-256-cbc";
// Derive a stable 256-bit encryption key
const ENCRYPTION_KEY = crypto.scryptSync(process.env.ENCRYPTION_SECRET || "ninaivunet-rest-secure-key-256-bit", "salt", 32);
const IV_LENGTH = 16;

function encryptText(text) {
  if (!text) return text;
  try {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
    let encrypted = cipher.update(String(text), "utf8", "hex");
    encrypted += cipher.final("hex");
    return iv.toString("hex") + ":" + encrypted;
  } catch (err) {
    console.error("Encryption error:", err.message);
    return text;
  }
}

function decryptText(encryptedText) {
  if (!encryptedText) return encryptedText;
  try {
    const parts = String(encryptedText).split(":");
    if (parts.length !== 2) return encryptedText; // not encrypted
    const iv = Buffer.from(parts[0], "hex");
    const encrypted = parts[1];
    const decipher = crypto.createDecipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
    let decrypted = decipher.update(encrypted, "hex", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
  } catch (err) {
    // Return original if it fails (e.g. legacy legacy records)
    return encryptedText;
  }
}

function encryptFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  try {
    const raw = fs.readFileSync(filePath);
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
    const encrypted = Buffer.concat([cipher.update(raw), cipher.final()]);
    fs.writeFileSync(filePath, Buffer.concat([iv, encrypted]));
  } catch (err) {
    console.error(`Failed to encrypt file ${filePath}:`, err.message);
  }
}

function decryptFile(filePath) {
  if (!fs.existsSync(filePath)) return null;
  try {
    const data = fs.readFileSync(filePath);
    if (data.length <= IV_LENGTH) return data;
    const iv = data.subarray(0, IV_LENGTH);
    const encrypted = data.subarray(IV_LENGTH);
    const decipher = crypto.createDecipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
    return decrypted;
  } catch (err) {
    console.error(`Failed to decrypt file ${filePath}:`, err.message);
    return fs.readFileSync(filePath); // fallback to raw
  }
}

module.exports = {
  encryptText,
  decryptText,
  encryptFile,
  decryptFile
};
