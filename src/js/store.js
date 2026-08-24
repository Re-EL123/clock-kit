const state = new Map();

export const store = {
  get(key) {
    return state.get(key);
  },
  set(key, value) {
    state.set(key, value);
    return value;
  },
};
