from flask import Flask, render_template, request, redirect, url_for, session, jsonify
from googletrans import Translator
import re
import os
app = Flask(__name__)
app.secret_key = "super_secret_key_change_me"

translator = Translator()

# ---------- helpers ----------
def is_strong_password(pw: str) -> bool:
    """
    At least 8 chars, 1 upper, 1 lower, 1 digit, 1 special.
    """
    return bool(re.fullmatch(r'(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}', pw or ""))

# ---------- routes ----------
@app.route("/")
def home():
    if "user" in session:
        return redirect(url_for("menu"))
    return redirect(url_for("login"))

@app.route("/login", methods=["GET", "POST"])
def login():
    if request.method == "POST":
        username = (request.form.get("username") or "").strip()
        password = request.form.get("password") or ""
        if not is_strong_password(password):
            return render_template("login.html", error="Password must be strong (8+ chars, upper, lower, digit, special).")
        # any username allowed if password is strong
        session["user"] = username or "Guest"
        return redirect(url_for("menu"))
    return render_template("login.html")

@app.route("/logout")
def logout():
    session.pop("user", None)
    return redirect(url_for("login"))

@app.route("/menu")
def menu():
    if "user" not in session:
        return redirect(url_for("login"))
    return render_template("menu.html", user=session["user"])

@app.route("/translator")
def translator_page():
    if "user" not in session:
        return redirect(url_for("login"))
    return render_template("translator.html")

@app.route("/about")
def about():
    if "user" not in session:
        return redirect(url_for("login"))
    return render_template("about.html")

@app.route("/profile")
def profile():
    if "user" not in session:
        return redirect(url_for("login"))
    return render_template("profile.html", user=session["user"])

# ---- API: translate ----
# language codes below are for googletrans and web-speech mapping
SUPPORTED = {
    "en": "English",
    "hi": "Hindi",
    "pa": "Punjabi",
    "bn": "Bengali",
    "gu": "Gujarati",
    "mr": "Marathi",
    "ta": "Tamil",
    "te": "Telugu",
    "ur": "Urdu"
}

@app.route("/api/translate", methods=["POST"])
def api_translate():
    if "user" not in session:
        return jsonify({"ok": False, "error": "unauthorized"}), 401

    data = request.get_json(force=True, silent=True) or {}
    text = (data.get("text") or "").strip()
    src = (data.get("src") or "auto").lower()
    tgt = (data.get("tgt") or "en").lower()

    if not text:
        return jsonify({"ok": False, "error": "Empty text"}), 400
    if tgt not in SUPPORTED and tgt != "en":
        return jsonify({"ok": False, "error": "Unsupported lang"}), 400

    try:
        res = translator.translate(text, src=src if src != "auto" else "auto", dest=tgt)

        return jsonify({"ok": True, "translated": res.text})
    except Exception as e:
        # Fallback: echo text if googletrans fails (no internet etc.)
        return jsonify({"ok": True, "translated": text, "note": "fallback (offline)"}), 200

if __name__ == "__main__":
    app.run(debug=True)
