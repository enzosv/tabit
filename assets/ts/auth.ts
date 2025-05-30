import "./types/jquery.d.ts";
import "./types/window.d.ts";

import { saveData } from "./main.ts";
import { loadData, renderAllHabits } from "./main.ts";
import { sync } from "./sync.ts";
import { tryCatch } from "./try-catch.ts";

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
    $("#logged-out-content").hide();
    $("#logged-in-content").show();
    $("#email-label").text(session.user.email ?? "anonymous user");
    return true;
  }
  console.log("logged out");
  $("#logged-out-content").show();
  $("#logged-in-content").hide();
  return false;
}

// Set up auth state change listener

export async function setupSession() {
  const isAuthenticated = await initializeSession();

  $("#loginButton").popover({
    html: true,
    content: $("#login-popover-template").html(),
    placement: "bottom",
    sanitize: false,
  });

  // Handle button state changes
  $("#loginButton").on("show.bs.popover", function () {
    $("#loginButton").text("Close");
  });

  $("#loginButton").on("hide.bs.popover", function () {
    $("#loginButton").text("Login");
  });

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
    if (session?.access_token) {
      authToken = session?.access_token ?? null;
      // Update UI for logged in state
      $("#loginButton").popover("hide"); // Hide popover on successful login
      $("#logged-out-content").hide();
      $("#logged-in-content").show();
    } else if (event === "SIGNED_OUT") {
      authToken = null;
      // Update UI for logged out state
      $("#logged-in-content").hide();
      $("#logged-out-content").show();
    }
  });

  $(document).on("submit", "#login-form", async function (e: Event) {
    e.preventDefault();

    const form = $(e.target);
    const email = form.find("#email").val() as string;
    const password = form.find("#password").val() as string;
    try {
      const { data: token, error } = await tryCatch(
        loginOrSignup(email, password)
      );
      if (error) {
        console.error(error);
        throw error;
      }

      authToken = token;
      const habits = loadData();
      sync(authToken, habits, 0) // 0 to not overwrite whats in the database
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

async function loginOrSignup(email: string, password: string): Promise<string> {
  const { data, error } = await tryCatch(
    window.supabase.auth.signInWithPassword({
      email,
      password,
    })
  );
  if (data && data.data.session) {
    // login successful
    return data.data.session.access_token;
  }
  if (data.error && data.error.message.includes("Invalid login credentials")) {
    console.log("User not found, trying to sign up...");
    // Try sign up
    const { data, error } = await window.supabase.auth.signUp({
      email,
      password,
    });
    if (data.session) {
      // signup successful
      return data.session.access_token;
    }
    if (data.user?.email) {
      console.log("signup success. logging in");
      // signup successful but no session. login
      const { data, error } = await tryCatch(
        window.supabase.auth.signInWithPassword({
          email,
          password,
        })
      );

      console.log("login", data);
      if (data && data.data.session) {
        // login sucessful
        console.log("login success", data.data.session);
        return data.data.session.access_token;
      }
      console.error("login failure", error);
      throw error;
    }
    throw error;
  }
  throw error;
}
