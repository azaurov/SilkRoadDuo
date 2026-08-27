import { DurableObject } from "cloudflare:workers";

const GRACE_MS = 30_000;
const STATE_KEY = "state";

function emptyPlayer() {
  return { name: null, avatar: null, color: null, score: 0, correct: 0, connected: false };
}

function defaultState() {
  return {
    mode: { type: "points", target: 100 },
    status: "waiting", // waiting | active | finished
    players: { host: emptyPlayer(), guest: emptyPlayer() },
    exercises: null,
    langId: null,
    topicId: null,
    startTimestamp: null,
    winner: null,
    disconnectDeadline: null,
  };
}

// One BattleRoom instance = one 1v1 match, keyed by room code (see src/index.js).
// Hibernatable WebSockets mean this DO's in-process JS state can be discarded
// and the class re-constructed between events while sockets stay open at the
// edge — so `this.state` is always loaded from ctx.storage in the constructor
// and written back on every mutation. Never trust class fields alone here.
export class BattleRoom extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    ctx.blockConcurrencyWhile(async () => {
      this.state = (await ctx.storage.get(STATE_KEY)) || defaultState();
    });
  }

  async persist() {
    await this.ctx.storage.put(STATE_KEY, this.state);
  }

  async fetch(request) {
    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);
    this.ctx.acceptWebSocket(server);
    return new Response(null, { status: 101, webSocket: client });
  }

  send(ws, obj) {
    try {
      ws.send(JSON.stringify(obj));
    } catch (_) {}
  }

  broadcast(obj) {
    const msg = JSON.stringify(obj);
    for (const ws of this.ctx.getWebSockets()) {
      try {
        ws.send(msg);
      } catch (_) {}
    }
  }

  publicState() {
    const pub = (p) => ({
      name: p.name, avatar: p.avatar, color: p.color,
      score: p.score, correct: p.correct, connected: p.connected,
    });
    return {
      type: "room_state",
      status: this.state.status,
      mode: this.state.mode,
      winner: this.state.winner,
      players: { host: pub(this.state.players.host), guest: pub(this.state.players.guest) },
    };
  }

  roleOf(ws) {
    const att = ws.deserializeAttachment();
    return att?.role || null;
  }

  other(role) {
    return role === "host" ? "guest" : "host";
  }

  async webSocketMessage(ws, raw) {
    let msg;
    try {
      msg = JSON.parse(raw);
    } catch (_) {
      return;
    }

    if (msg.type === "join") {
      const role = msg.role === "host" ? "host" : "guest";
      if (role === "guest" && !this.state.players.host.connected) {
        this.send(ws, { type: "error", message: "Room not found." });
        return;
      }
      if (this.state.players[role].connected) {
        this.send(ws, { type: "error", message: `Room already has a ${role}.` });
        return;
      }
      ws.serializeAttachment({ role });
      this.state.players[role] = {
        ...emptyPlayer(),
        name: msg.name || (role === "host" ? "Host" : "Guest"),
        avatar: msg.avatar || "🙂",
        color: msg.color || "#58CC02",
        connected: true,
      };
      await this.persist();
      this.broadcast(this.publicState());
      return;
    }

    const role = this.roleOf(ws);
    if (!role) return; // must join before anything else

    if (msg.type === "set_mode" && role === "host" && this.state.status === "waiting") {
      if (msg.mode?.type === "points") {
        this.state.mode = { type: "points", target: Number(msg.mode.target) || 100 };
      } else if (msg.mode?.type === "time") {
        this.state.mode = { type: "time", durationSec: Number(msg.mode.durationSec) || 120 };
      }
      await this.persist();
      this.broadcast(this.publicState());
      return;
    }

    if (msg.type === "start_exercises" && role === "host" && this.state.status === "waiting") {
      if (!this.state.players.guest.connected) {
        this.send(ws, { type: "error", message: "Waiting for opponent to join." });
        return;
      }
      this.state.exercises = Array.isArray(msg.exercises) ? msg.exercises : [];
      this.state.langId = msg.langId || null;
      this.state.topicId = msg.topicId ?? null;
      this.state.status = "active";
      this.state.startTimestamp = Date.now();
      await this.persist();
      this.broadcast({
        type: "start",
        exercises: this.state.exercises,
        mode: this.state.mode,
        startTimestamp: this.state.startTimestamp,
        langId: this.state.langId,
        topicId: this.state.topicId,
      });
      await this.scheduleAlarm();
      return;
    }

    if (msg.type === "score_update" && this.state.status === "active") {
      const p = this.state.players[role];
      p.score = Number(msg.score) || 0;
      p.correct = Number(msg.correct) || 0;
      await this.persist();
      this.broadcast(this.publicState());
      if (this.state.mode.type === "points" && p.score >= this.state.mode.target) {
        await this.finishGame(role, "points");
      }
      return;
    }

    if (msg.type === "leave") {
      await this.markDisconnected(role);
    }
  }

  async webSocketClose(ws) {
    const role = this.roleOf(ws);
    if (role) await this.markDisconnected(role);
  }

  async webSocketError(ws) {
    const role = this.roleOf(ws);
    if (role) await this.markDisconnected(role);
  }

  async markDisconnected(role) {
    if (!this.state.players[role].connected) return;
    this.state.players[role].connected = false;
    if (this.state.status === "active") {
      this.state.disconnectDeadline = Date.now() + GRACE_MS;
    }
    await this.persist();
    this.broadcast(this.publicState());
    if (this.state.status === "active") {
      await this.scheduleAlarm();
    }
  }

  // One alarm per DO — always schedule the *earliest* of (time-limit end,
  // forfeit grace deadline) rather than juggling separate timers.
  async scheduleAlarm() {
    let next = null;
    if (this.state.status === "active") {
      if (this.state.mode.type === "time" && this.state.startTimestamp) {
        next = this.state.startTimestamp + this.state.mode.durationSec * 1000;
      }
      if (this.state.disconnectDeadline) {
        next = next ? Math.min(next, this.state.disconnectDeadline) : this.state.disconnectDeadline;
      }
    }
    if (next) await this.ctx.storage.setAlarm(next);
    else await this.ctx.storage.deleteAlarm();
  }

  async alarm() {
    if (this.state.status !== "active") return;
    const now = Date.now();

    if (this.state.disconnectDeadline && now >= this.state.disconnectDeadline) {
      const hostGone = !this.state.players.host.connected;
      const guestGone = !this.state.players.guest.connected;
      if (hostGone || guestGone) {
        const forfeiter = hostGone ? "host" : "guest";
        await this.finishGame(this.other(forfeiter), "forfeit");
        return;
      }
      this.state.disconnectDeadline = null;
      await this.persist();
    }

    if (this.state.mode.type === "time" && this.state.startTimestamp &&
        now >= this.state.startTimestamp + this.state.mode.durationSec * 1000) {
      const { host, guest } = this.state.players;
      let winner = null;
      if (host.score > guest.score) winner = "host";
      else if (guest.score > host.score) winner = "guest";
      await this.finishGame(winner, "time_up");
      return;
    }

    await this.scheduleAlarm();
  }

  async finishGame(winner, reason) {
    this.state.status = "finished";
    this.state.winner = winner;
    this.state.disconnectDeadline = null;
    await this.persist();
    await this.ctx.storage.deleteAlarm();
    this.broadcast({ type: "game_over", winner, reason, players: this.publicState().players });
  }
}
