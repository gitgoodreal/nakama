const GUILD_ID = "1501909942146302053";

const ROLE_PRIORITY = [
  "King of the Pirates",
  "Admin",
  "Manager",
  "Moderator",
];

export async function onRequestGet(context) {
  const token = context.env.DISCORD_TOKEN;

  try {
    const membersRes = await fetch(
      `https://discord.com/api/v10/guilds/${GUILD_ID}/members?limit=100`,
      {
        headers: {
          Authorization: `Bot ${token}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!membersRes.ok) {
      const err = await membersRes.text();
      return new Response(JSON.stringify({ error: err }), {
        status: membersRes.status,
        headers: { "Content-Type": "application/json" },
      });
    }

    const members = await membersRes.json();

    const rolesRes = await fetch(
      `https://discord.com/api/v10/guilds/${GUILD_ID}/roles`,
      {
        headers: {
          Authorization: `Bot ${token}`,
          "Content-Type": "application/json",
        },
      }
    );

    const roles = await rolesRes.json();

    const roleMap = {};
    roles.forEach(r => {
      roleMap[r.id] = {
        name: r.name,
        color: r.color
          ? `#${r.color.toString(16).padStart(6, "0")}`
          : "#94a3b8",
      };
    });

    const cleaned = members
      .filter(m => !m.user.bot)
      .map(m => {
        const memberRoleNames = m.roles
          .map(rid => roleMap[rid])
          .filter(Boolean)
          .map(r => r.name);

        const topPriorityRole = ROLE_PRIORITY.find(p =>
          memberRoleNames.includes(p)
        );

        const topRole = topPriorityRole
          ? {
              name: topPriorityRole,
              color: Object.values(roleMap).find(r => r.name === topPriorityRole)?.color || "#94a3b8",
            }
          : null;

        const avatar = m.user.avatar
          ? `https://cdn.discordapp.com/avatars/${m.user.id}/${m.user.avatar}.png?size=128`
          : `https://cdn.discordapp.com/embed/avatars/${parseInt(m.user.id) % 5}.png`;

        return {
          id: m.user.id,
          username: m.user.username,
          displayName: m.nick || m.user.global_name || m.user.username,
          avatar,
          role: topRole ? topRole.name : "Crewmate",
          roleColor: topRole ? topRole.color : "#94a3b8",
          joinedAt: m.joined_at,
          rolePriority: topPriorityRole
            ? ROLE_PRIORITY.indexOf(topPriorityRole)
            : 999,
        };
      })
      .sort((a, b) => a.rolePriority - b.rolePriority);

    return new Response(JSON.stringify(cleaned), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
