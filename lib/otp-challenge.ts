/**
 * sessionStorage key for the pending OTP challenge id. Login and signup store
 * it here instead of putting it in the /verify URL (#638); the verify page
 * reads and clears it.
 */
export const CHALLENGE_SESSION_KEY = 'aframp.challenge_id'
