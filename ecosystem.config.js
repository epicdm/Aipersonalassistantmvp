module.exports = {
  apps: [{
    name: 'bff-web',
    script: 'node_modules/.bin/next',
    args: 'start -p 3002',
    cwd: '/opt/bff',
    env: {
      NODE_ENV: 'production',
      PORT: '3002',
      DATABASE_URL: '',
      WHATSAPP_TOKEN: 'EAASYM2T02a4BQZBot2MaWEtmkPQZAPjMj0xZBBnnBhHyljnHi1sYDo3IOvbrU2i9J1BTpysjZBiRjNHzO8J7NBcMSaSmrGqH9mME8iDqijb64XQVDO8ER5K9WFUNK07TQgQpWTmdHD1u5ddbweHyP71ntNbQI8uBGMQCBpyYuVufnWWakxfZBw3LzczpcWo5ilQZDZD',
      WHATSAPP_PHONE_ID: '1003873729481088',
      META_WA_TOKEN: 'EAASYM2T02a4BQZBot2MaWEtmkPQZAPjMj0xZBBnnBhHyljnHi1sYDo3IOvbrU2i9J1BTpysjZBiRjNHzO8J7NBcMSaSmrGqH9mME8iDqijb64XQVDO8ER5K9WFUNK07TQgQpWTmdHD1u5ddbweHyP71ntNbQI8uBGMQCBpyYuVufnWWakxfZBw3LzczpcWo5ilQZDZD',
      META_PHONE_ID: '1003873729481088',
      META_WA_VERIFY_TOKEN: 'epic-wa-2026',
      DEEPSEEK_API_KEY: 'sk-443f0af69dc14ee095fce92d16928850',
      CLERK_SECRET_KEY: '${CLERK_SECRET_KEY}',
      NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: 'pk_live_Y2xlcmsuZXBpYy5kbSQ',
      NEXT_PUBLIC_CLERK_SIGN_IN_URL: '/sign-in',
      NEXT_PUBLIC_CLERK_SIGN_UP_URL: '/sign-up',
      NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL: '/dashboard',
      NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL: '/dashboard'
    }
  }]
}
