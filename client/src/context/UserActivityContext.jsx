import { createContext, useContext, useReducer, useCallback } from "react";

const UserActivityContext = createContext();

const initialState = {
  viewedProducts: [],     // [{ id, name, category, timestamp }]
  cart: [],               // [{ id, name, price, quantity }]
  currentProduct: null,   // { id, name, category } — what user is looking at right now
  currentPage: "home",    // home | catalog | robot | assistant | support
  searchQuery: "",        // last search term
  selectedCategory: "",   // last selected category filter
};

function activityReducer(state, action) {
  switch (action.type) {
    case "VIEW_PRODUCT": {
      const already = state.viewedProducts.find((p) => p.id === action.payload.id);
      const viewed = already
        ? state.viewedProducts
        : [...state.viewedProducts.slice(-19), { ...action.payload, timestamp: Date.now() }];
      return { ...state, viewedProducts: viewed, currentProduct: action.payload };
    }
    case "ADD_TO_CART": {
      const existing = state.cart.find((item) => item.id === action.payload.id);
      if (existing) {
        return {
          ...state,
          cart: state.cart.map((item) =>
            item.id === action.payload.id ? { ...item, quantity: item.quantity + 1 } : item
          ),
        };
      }
      return { ...state, cart: [...state.cart, { ...action.payload, quantity: 1 }] };
    }
    case "REMOVE_FROM_CART":
      return { ...state, cart: state.cart.filter((item) => item.id !== action.payload) };
    case "SET_PAGE":
      return { ...state, currentPage: action.payload };
    case "SET_SEARCH":
      return { ...state, searchQuery: action.payload };
    case "SET_CATEGORY":
      return { ...state, selectedCategory: action.payload };
    case "CLEAR_CURRENT_PRODUCT":
      return { ...state, currentProduct: null };
    default:
      return state;
  }
}

export function UserActivityProvider({ children }) {
  const [state, dispatch] = useReducer(activityReducer, initialState);

  const viewProduct = useCallback((product) => {
    dispatch({ type: "VIEW_PRODUCT", payload: { id: product.id, name: product.name, category: product.category } });
  }, []);

  const addToCart = useCallback((product) => {
    dispatch({ type: "ADD_TO_CART", payload: { id: product.id, name: product.name, price: product.price } });
  }, []);

  const removeFromCart = useCallback((id) => {
    dispatch({ type: "REMOVE_FROM_CART", payload: id });
  }, []);

  const setPage = useCallback((page) => {
    dispatch({ type: "SET_PAGE", payload: page });
  }, []);

  const setSearch = useCallback((query) => {
    dispatch({ type: "SET_SEARCH", payload: query });
  }, []);

  const setCategory = useCallback((cat) => {
    dispatch({ type: "SET_CATEGORY", payload: cat });
  }, []);

  const clearCurrentProduct = useCallback(() => {
    dispatch({ type: "CLEAR_CURRENT_PRODUCT" });
  }, []);

  // Build context summary for the AI chatbot
  const getContextSummary = useCallback(() => {
    const parts = [];
    if (state.currentProduct) {
      parts.push(`User is viewing: ${state.currentProduct.name} (${state.currentProduct.category})`);
    }
    if (state.cart.length > 0) {
      parts.push(`Cart: ${state.cart.map((i) => `${i.name} x${i.quantity}`).join(", ")}`);
    }
    if (state.viewedProducts.length > 0) {
      const recent = state.viewedProducts.slice(-5).map((p) => p.name);
      parts.push(`Recently viewed: ${recent.join(", ")}`);
    }
    if (state.searchQuery) {
      parts.push(`Last search: "${state.searchQuery}"`);
    }
    if (state.selectedCategory && state.selectedCategory !== "All") {
      parts.push(`Browsing category: ${state.selectedCategory}`);
    }
    return parts.length > 0 ? parts.join(". ") : "User just arrived, no activity yet.";
  }, [state]);

  return (
    <UserActivityContext.Provider
      value={{
        ...state,
        viewProduct,
        addToCart,
        removeFromCart,
        setPage,
        setSearch,
        setCategory,
        clearCurrentProduct,
        getContextSummary,
      }}
    >
      {children}
    </UserActivityContext.Provider>
  );
}

export function useUserActivity() {
  const ctx = useContext(UserActivityContext);
  if (!ctx) throw new Error("useUserActivity must be used within UserActivityProvider");
  return ctx;
}
