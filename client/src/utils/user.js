export function getOrCreateUserId() {
    const existing = localStorage.getItem("nexus_user_id");
    if (existing) return existing;
    const generated = `USR-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
    localStorage.setItem("nexus_user_id", generated);
    return generated;
}
