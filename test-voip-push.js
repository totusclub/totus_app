/**
 * Test script to send VoIP push notifications
 * 
 * Prerequisites:
 * 1. Install dependencies: npm install jsonwebtoken
 * 2. Get your APNs Auth Key (.p8 file) from Apple Developer Portal
 * 3. Get your Team ID and Key ID from Apple Developer Portal
 * 4. Get VoIP token from your app (check console logs)
 * 
 * Usage:
 * node test-voip-push.js
 */

const https = require('https');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');

// ===== CONFIGURATION =====
// Update these values with your own
const TEAM_ID = 'YOUR_TEAM_ID'; // From Apple Developer Portal
const KEY_ID = 'YOUR_KEY_ID'; // From your APNs Auth Key
const BUNDLE_ID = 'app.totus.club'; // Your app's bundle ID
const AUTH_KEY_PATH = './AuthKey.p8'; // Path to your .p8 file
const DEVICE_TOKEN = 'YOUR_VOIP_TOKEN_HERE'; // Get from app console logs

// ===== PAYLOAD CONFIGURATION =====
const CALL_UUID = `test-${Date.now()}`;
const CALLER_NAME = 'Test Caller';
const CALLER_NUMBER = '+1234567890';
const HAS_VIDEO = false;

// ===== SCRIPT =====

function generateJWT() {
  try {
    const keyPath = path.resolve(AUTH_KEY_PATH);
    
    if (!fs.existsSync(keyPath)) {
      throw new Error(`Auth key file not found at: ${keyPath}`);
    }

    const privateKey = fs.readFileSync(keyPath);

    const token = jwt.sign({}, privateKey, {
      algorithm: 'ES256',
      header: {
        alg: 'ES256',
        kid: KEY_ID,
      },
      issuer: TEAM_ID,
      expiresIn: '1h',
    });

    return token;
  } catch (error) {
    console.error('Error generating JWT:', error.message);
    process.exit(1);
  }
}

function sendVoIPPush(token, deviceToken) {
  const payload = JSON.stringify({
    aps: {
      alert: {
        title: 'Incoming Call',
        body: `${CALLER_NAME} is calling`,
      },
      sound: 'default',
    },
    call: {
      uuid: CALL_UUID,
      callerName: CALLER_NAME,
      callerNumber: CALLER_NUMBER,
      hasVideo: HAS_VIDEO,
    },
  });

  // Use sandbox for development, production for App Store builds
  const hostname = 'api.sandbox.push.apple.com'; // Change to 'api.push.apple.com' for production
  const port = 443;
  const path = `/3/device/${deviceToken}`;

  const options = {
    hostname,
    port,
    path,
    method: 'POST',
    headers: {
      'apns-topic': `${BUNDLE_ID}.voip`,
      'apns-push-type': 'voip',
      'apns-priority': '10',
      'apns-expiration': '0',
      'authorization': `bearer ${token}`,
      'content-type': 'application/json',
      'content-length': Buffer.byteLength(payload),
    },
  };

  console.log('Sending VoIP push...');
  console.log('Device Token:', deviceToken);
  console.log('Payload:', JSON.stringify(JSON.parse(payload), null, 2));

  const req = https.request(options, (res) => {
    let responseData = '';

    res.on('data', (chunk) => {
      responseData += chunk;
    });

    res.on('end', () => {
      if (res.statusCode === 200) {
        console.log('\n✅ Success! VoIP push sent successfully');
        console.log('Response:', responseData || 'No response body');
      } else {
        console.error('\n❌ Error sending VoIP push');
        console.error('Status Code:', res.statusCode);
        console.error('Response:', responseData);
        
        // Parse error response
        try {
          const error = JSON.parse(responseData);
          console.error('Error Details:', error);
        } catch (e) {
          console.error('Could not parse error response');
        }
      }
    });
  });

  req.on('error', (error) => {
    console.error('\n❌ Request error:', error.message);
    process.exit(1);
  });

  req.write(payload);
  req.end();
}

// Validate configuration
if (TEAM_ID === 'YOUR_TEAM_ID' || KEY_ID === 'YOUR_KEY_ID' || DEVICE_TOKEN === 'YOUR_VOIP_TOKEN_HERE') {
  console.error('❌ Please update the configuration in this script:');
  console.error('   - TEAM_ID');
  console.error('   - KEY_ID');
  console.error('   - DEVICE_TOKEN (get from app console)');
  console.error('   - AUTH_KEY_PATH (path to your .p8 file)');
  process.exit(1);
}

// Generate JWT and send push
const jwtToken = generateJWT();
console.log('JWT Token generated successfully\n');
sendVoIPPush(jwtToken, DEVICE_TOKEN);


