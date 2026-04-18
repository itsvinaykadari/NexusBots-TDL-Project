const USER_ID_KEY = "nexus_user_id";
const USER_NAME_KEY = "nexus_user_name";

// Fixed admin session — always "Admin" on first load
const ADMIN_ID = "USR-ADMIN";
const ADMIN_NAME = "Admin";

export function getOrCreateUserId() {
    let id = localStorage.getItem(USER_ID_KEY);
    if (!id) {
        id = ADMIN_ID;
        localStorage.setItem(USER_ID_KEY, id);
    }
    return id;
}

export function getUserName() {
    let name = localStorage.getItem(USER_NAME_KEY);
    if (!name) {
        name = ADMIN_NAME;
        localStorage.setItem(USER_NAME_KEY, name);
    }
    return name;
}
