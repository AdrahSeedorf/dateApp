/**
 * Who did a thing, from the reader's point of view.
 *
 * Every row that records an actor stores a profile id, and every screen that
 * shows one needs the same three-way answer: it was you, it was them, or we
 * don't know. Doing that inline in each component was how the live date
 * screen ended up rendering the literal string "Them" for a month.
 *
 * The rule throughout: when we don't know, say nothing. A blank is honest;
 * "Someone" is a made-up fact, and every plan created before migration 0014
 * has a null in these columns.
 */

export type Viewer = {
  userId: string;
  partnerId: string | null;
  partnerName: string | null;
};

/**
 * "You", the partner's name, or null.
 *
 * Null when the actor is unknown, when the row predates attribution, or when
 * the actor is someone we can't name — a partner who has since left the
 * couple, whose profile is gone but whose dates remain.
 */
export function nameOf(actorId: string | null, viewer: Viewer): string | null {
  if (!actorId) return null;
  if (actorId === viewer.userId) return "You";

  // Known to be the partner, but they never set a display name. Better to
  // say nothing than to invent one.
  if (actorId === viewer.partnerId) return viewer.partnerName ?? null;

  return null;
}

/** True when the actor is the person reading the screen. */
export function isYou(actorId: string | null, viewer: Viewer): boolean {
  return Boolean(actorId) && actorId === viewer.userId;
}

/**
 * A sentence, conjugated correctly.
 *
 *   credit("saved", "cancelled this", viewer)  →  "You cancelled this"
 *                                              →  "Karina cancelled this"
 *                                              →  null
 *
 * The past tense makes this work for both subjects without a second form,
 * which is why every caller phrases the verb that way.
 */
export function credit(actorId: string | null, verb: string, viewer: Viewer): string | null {
  const name = nameOf(actorId, viewer);
  if (!name) return null;

  return `${name} ${verb}`;
}

/**
 * Possessive, for labelling a thing rather than an action.
 *
 *   possessive(id, viewer)  →  "Your" | "Karina's" | null
 *
 * Names ending in s take a bare apostrophe, which is the convention most
 * style guides land on and the one that doesn't look like a typo.
 */
export function possessive(actorId: string | null, viewer: Viewer): string | null {
  const name = nameOf(actorId, viewer);
  if (!name) return null;
  if (name === "You") return "Your";

  return name.endsWith("s") ? `${name}'` : `${name}'s`;
}

/**
 * Whether attribution is worth showing at all.
 *
 * Alone in the couple, every row is yours, and an app that keeps telling you
 * that you did the thing you just did is noise. Attribution only means
 * something once there are two people it could distinguish between.
 */
export function attributionIsMeaningful(viewer: Viewer): boolean {
  return viewer.partnerId !== null;
}
