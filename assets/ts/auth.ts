/// <reference path="./types/jquery.d.ts" />
/// <reference path="./types/window.d.ts" />

import { saveData } from "./main.ts";
import { loadData, renderAllHabits } from "./main.ts";
import { sync } from "./sync.ts";

export let authToken: string | null = null;

async function initializeSession() {
  const {
    data: { session },
    error,
  } = await window.supabase.auth.getSession();
  if (error) {
    console.error("Error checking session:", error);
    return false;
  }

  if (session) {
    // User is already logged in
    authToken = session.access_token;
    $(".logged-out-content").hide();
    $(".logged-in-content").show();
    return true;
  }
  $(".logged-out-content").show();
  $(".logged-in-content").hide();
  return false;
}

// Set up auth state change listener

export async function setupSession() {
  const isAuthenticated = await initializeSession();

  const data = loadData();
  if (isAuthenticated) {
    // User has an existing session
    sync(authToken, data, 0)
      .then((result) => {
        const habits = JSON.parse(result.data.Data);
        saveData(habits);
        renderAllHabits(habits);
      })
      .catch((err) => {
        // no session. use localstorage
        console.error(err);
        renderAllHabits(data);
      });
  } else {
    // no session. use localstorage
    renderAllHabits(data);
  }

  window.supabase.auth.onAuthStateChange((event, session) => {
    if (event === "SIGNED_IN") {
      authToken = session?.access_token ?? null;
      // Update UI for logged in state
      $("#loginCollapse").collapse("hide");
      $(".logged-out-content").hide();
      $(".logged-in-content").show();
    } else if (event === "SIGNED_OUT") {
      authToken = null;
      // Update UI for logged out state
      $(".logged-in-content").hide();
      $(".logged-out-content").show();
    }
  });

  // Modify login form handler
  $("#login-form").on("submit", async function (e) {
    e.preventDefault();

    const email = $("#email").val() as string;
    const password = $("#password").val() as string;

    try {
      const {
        data: { session },
        error,
      } = await window.supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      authToken = session.access_token;
      const habits = loadData();
      sync(authToken, habits, 0)
        .then((result) => {
          renderAllHabits(JSON.parse(result.data.Data));
        })
        .catch((err) => {
          console.error(err);
          renderAllHabits(habits);
        });
    } catch (error) {
      console.error("Login error:", error);
      alert("Login failed. Please check your credentials.");
    }
  });

  // Add logout functionality
  $("#logout-button").on("click", () => {
    authToken = null;
    localStorage.clear();
    window.supabase.auth.signOut().finally(() => {
      window.location.reload();
    });
  });
}
