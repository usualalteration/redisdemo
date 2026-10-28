# Trustable Prompt

```
# Build Redis LiveBoard — An Interactive Real-Time Dashboard

Create a complete, visually stunning **Redis LiveBoard** application using React, Tailwind CSS, Python actions on Nuvolaris OpenServerless, and Redis.

The application should demonstrate Redis capabilities through an interactive dashboard where users can manipulate data and immediately observe the results.

Build and configure everything automatically using the available tools. Do not ask for confirmation between steps.

## Application Features

Create five interactive Redis demonstrations:

**1. Live Counters**
- Display three counters: Page Views, API Requests, and Active Sessions.
- Provide buttons to increment and reset counters.
- Use Redis atomic `INCR` operations.
- Animate counter changes with smooth number transitions.

**2. Real-Time Leaderboard**
- Display a leaderboard of six fictional players with avatars, names, scores, and rankings.
- Use Redis Sorted Sets (`ZADD`, `ZREVRANGE`) to store and rank players.
- Allow users to award random points to players.
- Animate ranking changes and highlight the top three players.

**3. Cache Explorer**
- Create an interactive key-value editor.
- Allow users to create, retrieve, update, and delete Redis keys.
- Support configurable TTL values (30 seconds, 1 minute, 5 minutes).
- Display a visual countdown showing when each key expires.
- Demonstrate cache hits and misses.

**4. Live Activity Feed**
- Display a chronological stream of dashboard events, such as counter increments, score changes, and cache updates.
- Use Redis Streams (`XADD`, `XREVRANGE`) to store activity events.
- Automatically refresh the activity feed every few seconds.

**5. Redis Health and Statistics**
- Show total demo keys, cache hits, cache misses, and Redis memory usage.
- Display a live chart of recent activity.
- Use Redis commands such as `INFO` and `DBSIZE` where permitted.
- Clearly distinguish demo-specific metrics from server-wide statistics.

## Redis Backend

Implement all backend functionality using Python actions on Nuvolaris OpenServerless.

- Configure Redis using the available `action_add_redis` tool.
- Use the Redis connection exposed by the OpenServerless runtime.
- Create Python actions for counters, leaderboard, cache operations, activity feed, and statistics.
- Use JSON request and response formats.
- Validate all inputs and implement robust error handling.
- Prefix application keys with `liveboard:` to avoid collisions.
- Seed six fictional leaderboard players only once.
- Never use mock data or browser localStorage as the source of persistent application state.
- Use appropriate Redis atomic operations and expiration commands.
- Avoid destructive operations such as `FLUSHDB` and `FLUSHALL`.
- Ensure every interactive feature works with actual Redis data.

## React Frontend and Visual Design

Create a distinctive, premium interface inspired by **Linear, Vercel, modern fintech dashboards, and futuristic developer tools**.

The UI must feel like a polished commercial product rather than a generic admin dashboard.

**Visual direction**
- Deep midnight navy background (`#080D1A`).
- Glassmorphism panels with translucent surfaces and subtle backdrop blur.
- Electric violet, cyan, and coral accents.
- Soft glowing gradients behind important components.
- Large typography with strong visual hierarchy.
- Rounded 2xl cards, subtle borders, and layered shadows.
- Smooth transitions and microanimations using Framer Motion if available.
- Lucide icons for navigation, status indicators, and actions.

**Dashboard layout**

Create a responsive dashboard with:

- A slim left sidebar containing an illuminated Redis LiveBoard logo and navigation.
- A top header with the title **Redis Command Center**, a live connection indicator, and a Redis status badge.
- Three large animated counter cards across the top.
- A visually prominent leaderboard with gradient podium elements and animated score changes.
- An interactive cache explorer with terminal-inspired key-value rows and animated TTL progress bars.
- A vertically scrolling live activity timeline with colorful event icons.
- A Redis statistics panel with charts and compact metrics.

**Interactive details**
- Buttons should glow subtly on hover.
- Counters should animate when incremented.
- Leaderboard positions should transition smoothly.
- Expiring cache keys should show animated countdown bars.
- Successful actions should display elegant toast notifications.
- Loading states should use skeleton animations.
- Error messages should be informative and visually consistent.
- The interface must work well on desktop, tablet, and mobile.

Use a combination of **glassmorphism, dark-mode fintech, neon gradients, and data visualization** while maintaining excellent readability.

## Integration and Verification

- Connect every React component to real OpenServerless Python actions.
- Ensure all Redis operations are executed on the backend.
- Refresh counters, rankings, and statistics automatically using lightweight polling.
- Clean up polling intervals when components unmount.
- Avoid unnecessary API calls.
- Verify data persistence by refreshing the browser.
- Demonstrate Redis TTL expiration by allowing users to watch a key disappear.
- Test counter increments, leaderboard rankings, cache operations, and stream events.
- Run the available frontend and backend validation tools and fix any detected errors.

The result must be a fully working, visually impressive application demonstrating:

**React → Nuvolaris OpenServerless → Redis**

Prioritize a memorable user experience while keeping the backend implementation simple, understandable, and reliable.
```

