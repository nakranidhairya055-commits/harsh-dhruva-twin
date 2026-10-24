import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

/**
 * Post a note/observation against a station's equipment from the workspace.
 * The station is resolved from the slug server-side so clients cannot attach
 * content to a station that does not exist.
 */
export const postNote = mutation({
  args: {
    stationSlug: v.string(),
    equipmentId: v.string(),
    sensorId: v.optional(v.string()),
    title: v.string(),
    body: v.string(),
    kind: v.union(
      v.literal("observation"),
      v.literal("maintenance"),
      v.literal("question"),
    ),
  },
  handler: async (ctx, { stationSlug, equipmentId, sensorId, title, body, kind }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Sign in required to post content.");
    const station = await ctx.db
      .query("stations")
      .withIndex("by_slug", (q) => q.eq("slug", stationSlug))
      .unique();
    if (!station) throw new Error("Unknown station.");
    return await ctx.db.insert("stationNotes", {
      authorId: userId,
      stationId: station._id,
      equipmentId,
      sensorId,
      title,
      body,
      kind,
      status: "published",
      createdAt: Date.now(),
    });
  },
});

/** List published notes for a station (newest first), joined with authors. */
export const listNotes = query({
  args: {
    stationSlug: v.string(),
    equipmentId: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { stationSlug, equipmentId, limit }) => {
    const n = Math.min(Math.max(limit ?? 30, 1), 100);
    const station = await ctx.db
      .query("stations")
      .withIndex("by_slug", (q) => q.eq("slug", stationSlug))
      .unique();
    if (!station) return [];
    let rows = await ctx.db
      .query("stationNotes")
      .withIndex("by_station_created", (q) => q.eq("stationId", station._id))
      .collect();
    if (equipmentId) rows = rows.filter((r) => r.equipmentId === equipmentId);
    const sorted = rows
      .filter((r) => r.status === "published")
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, n);
    const users = await Promise.all(sorted.map((r) => ctx.db.get(r.authorId)));
    return sorted.map((r, i) => ({
      _id: r._id,
      title: r.title,
      body: r.body,
      kind: r.kind,
      equipmentId: r.equipmentId,
      sensorId: r.sensorId,
      createdAt: r.createdAt,
      authorName: users[i]?.name ?? users[i]?.email ?? "Operator",
    }));
  },
});

/** List notes authored by the current user (their workspace). */
export const listMyNotes = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, { limit }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    const n = Math.min(Math.max(limit ?? 30, 1), 100);
    const rows = await ctx.db
      .query("stationNotes")
      .withIndex("by_author", (q) => q.eq("authorId", userId))
      .collect();
    const sorted = rows.sort((a, b) => b.createdAt - a.createdAt).slice(0, n);
    const stations = await ctx.db.query("stations").collect();
    const stById = new Map(stations.map((s) => [s._id, s]));
    return sorted.map((r) => ({
      _id: r._id,
      title: r.title,
      body: r.body,
      kind: r.kind,
      equipmentId: r.equipmentId,
      createdAt: r.createdAt,
      status: r.status,
      stationName: stById.get(r.stationId)?.name ?? "Unknown",
      stationSlug: stById.get(r.stationId)?.slug ?? "unknown",
    }));
  },
});

/** Comments on a note (published only), joined with authors. */
export const listComments = query({
  args: { noteId: v.id("stationNotes") },
  handler: async (ctx, { noteId }) => {
    const rows = await ctx.db
      .query("noteComments")
      .withIndex("by_note", (q) => q.eq("noteId", noteId))
      .collect();
    const sorted = rows
      .filter((r) => r.status === "published")
      .sort((a, b) => a.createdAt - b.createdAt);
    const users = await Promise.all(sorted.map((r) => ctx.db.get(r.authorId)));
    return sorted.map((r, i) => ({
      _id: r._id,
      body: r.body,
      createdAt: r.createdAt,
      authorName: users[i]?.name ?? users[i]?.email ?? "Operator",
    }));
  },
});

/** Add a comment to a note. Requires sign-in. */
export const addComment = mutation({
  args: { noteId: v.id("stationNotes"), body: v.string() },
  handler: async (ctx, { noteId, body }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Sign in required to comment.");
    const note = await ctx.db.get(noteId);
    if (!note || note.status !== "published") {
      throw new Error("Note not found or removed.");
    }
    await ctx.db.insert("noteComments", {
      noteId,
      authorId: userId,
      body,
      status: "published",
      createdAt: Date.now(),
    });
    return { ok: true };
  },
});

/** Author or admin removes their own note (soft delete for moderation). */
export const removeNote = mutation({
  args: { noteId: v.id("stationNotes") },
  handler: async (ctx, { noteId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Sign in required.");
    const note = await ctx.db.get(noteId);
    if (!note) throw new Error("Note not found.");
    const user = await ctx.db.get(userId);
    const isAdmin = (user as { twinRole?: string } | null)?.twinRole === "admin";
    if (note.authorId !== userId && !isAdmin) {
      throw new Error("Only the author or an admin can remove a note.");
    }
    await ctx.db.patch(noteId, { status: "removed" });
    return { ok: true };
  },
});

/** Admin console: list all operator accounts with roles. */
export const listUsers = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Sign in required.");
    const caller = await ctx.db.get(userId);
    if ((caller as { twinRole?: string } | null)?.twinRole !== "admin") {
      throw new Error("Admin access required.");
    }
    return await ctx.db.query("users").collect();
  },
});

/** Admin console: list every note across stations including removed ones. */
export const listAllNotes = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, { limit }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Sign in required.");
    const caller = await ctx.db.get(userId);
    if ((caller as { twinRole?: string } | null)?.twinRole !== "admin") {
      throw new Error("Admin access required.");
    }
    const n = Math.min(Math.max(limit ?? 50, 1), 200);
    const rows = await ctx.db.query("stationNotes").collect();
    const sorted = rows.sort((a, b) => b.createdAt - a.createdAt).slice(0, n);
    const stations = await ctx.db.query("stations").collect();
    const stById = new Map(stations.map((s) => [s._id, s]));
    const users = await Promise.all(sorted.map((r) => ctx.db.get(r.authorId)));
    return sorted.map((r, i) => ({
      _id: r._id,
      title: r.title,
      kind: r.kind,
      status: r.status,
      createdAt: r.createdAt,
      equipmentId: r.equipmentId,
      stationName: stById.get(r.stationId)?.name ?? "Unknown",
      authorName: users[i]?.name ?? users[i]?.email ?? "Operator",
    }));
  },
});

/** Admin: set an operator's DhruvaTwin role. */
export const setUserRole = mutation({
  args: {
    userId: v.id("users"),
    twinRole: v.union(
      v.literal("admin"),
      v.literal("commander"),
      v.literal("scientist"),
      v.literal("station"),
    ),
  },
  handler: async (ctx, { userId, twinRole }) => {
    const callerId = await getAuthUserId(ctx);
    if (!callerId) throw new Error("Sign in required.");
    const caller = await ctx.db.get(callerId);
    if ((caller as { twinRole?: string } | null)?.twinRole !== "admin") {
      throw new Error("Admin access required.");
    }
    await ctx.db.patch(userId, { twinRole });
    return { ok: true };
  },
});

