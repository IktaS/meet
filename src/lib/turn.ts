import crypto from 'crypto';

export function generateTurnCredentials(usernameBase: string, secret: string, ttlSeconds = 3600) {
  const unixTime = Math.floor(Date.now() / 1000) + ttlSeconds;
  const username = `${unixTime}:${usernameBase}`;
  const hmac = crypto.createHmac('sha1', secret);
  hmac.setEncoding('base64');
  hmac.update(username);
  hmac.end();
  const credential = hmac.read();
  return { username, credential, ttl: ttlSeconds };
} 