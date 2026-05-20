export async function onRequestGet(context) {
  const { request, env } = context;

  const SITE_URL        = 'https://nakamashiptm1.pages.dev';
  const REDIRECT_URI    = `${SITE_URL}/functions/auth`;
  const CLIENT_ID       = env.DISCORD_CLIENT_ID;
  const CLIENT_SECRET   = env.DISCORD_CLIENT_SECRET;
  const BOT_TOKEN       = env.DISCORD_BOT_TOKEN;
  const GUILD_ID        = env.DISCORD_GUILD_ID;
  const VERIFIED_ROLE   = env.DISCORD_VERIFIED_ROLE;
  const UNVERIFIED_ROLE = env.DISCORD_UNVERIFIED_ROLE;

  const url  = new URL(request.url);
  const code = url.searchParams.get('code');

  if (!code) {
    return Response.redirect(`${SITE_URL}/verify.html?error=no_code`, 302);
  }

  try {
    // 1. Exchange code for access token
    const tokenRes = await fetch('https://discord.com/api/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id:     CLIENT_ID,
        client_secret: CLIENT_SECRET,
        grant_type:    'authorization_code',
        code,
        redirect_uri:  REDIRECT_URI,
      }),
    });

    const tokenData = await tokenRes.json();

    if (!tokenData.access_token) {
      console.error('Token exchange failed:', JSON.stringify(tokenData));
      return Response.redirect(`${SITE_URL}/verify.html?error=token_failed`, 302);
    }

    // 2. Get user's Discord ID
    const userRes = await fetch('https://discord.com/api/users/@me', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });

    const user = await userRes.json();

    if (!user.id) {
      console.error('User fetch failed:', JSON.stringify(user));
      return Response.redirect(`${SITE_URL}/verify.html?error=user_fetch_failed`, 302);
    }

    // 3. Assign Verified role
    await fetch(`https://discord.com/api/guilds/${GUILD_ID}/members/${user.id}/roles/${VERIFIED_ROLE}`, {
      method:  'PUT',
      headers: { Authorization: `Bot ${BOT_TOKEN}` },
    });

    // 4. Remove Unverified role
    if (UNVERIFIED_ROLE) {
      await fetch(`https://discord.com/api/guilds/${GUILD_ID}/members/${user.id}/roles/${UNVERIFIED_ROLE}`, {
        method:  'DELETE',
        headers: { Authorization: `Bot ${BOT_TOKEN}` },
      });
    }

    return Response.redirect(`${SITE_URL}/verify.html?success=1`, 302);

  } catch (err) {
    console.error('Auth error:', err);
    return Response.redirect(`${SITE_URL}/verify.html?error=server_error`, 302);
  }
}