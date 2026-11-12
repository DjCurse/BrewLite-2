"use client";

import { FormEvent, useState } from "react";

type UserProfile = {
  name: string;
  email: string;
  loyaltyPoints: number;
};

const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

function getReturnPath() {
  const params = new URLSearchParams(window.location.search);
  const requestedPath = params.get("returnTo");

  if (requestedPath) {
    try {
      const target = new URL(requestedPath, window.location.origin);
      if (target.origin === window.location.origin && target.pathname !== "/login") {
        return `${target.pathname}${target.search}${target.hash}`;
      }
    } catch {
      // Ignore malformed return paths and try the referring page instead.
    }
  }

  if (document.referrer) {
    try {
      const referrer = new URL(document.referrer);
      if (referrer.origin === window.location.origin && referrer.pathname !== "/login") {
        return `${referrer.pathname}${referrer.search}${referrer.hash}`;
      }
    } catch {
      // Ignore an invalid referrer.
    }
  }

  return null;
}

export default function Home() {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    const normalizedEmail = email.trim();
    if (mode === "login" && (!normalizedEmail || !password)) {
      setError("Vui lòng điền đầy đủ thông tin.");
      return;
    }

    if (mode === "register" && name.trim().length < 2) {
      setError("Tên cần có ít nhất 2 ký tự.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      setError("Vui lòng nhập email hợp lệ.");
      return;
    }
    if (mode === "register" && password.length < 6) {
      setError("Mật khẩu phải có ít nhất 6 ký tự.");
      return;
    }
    if (mode === "register" && !/[A-Za-z]/.test(password)) {
      setError("Mật khẩu phải có ít nhất một chữ cái.");
      return;
    }
    if (mode === "register" && !/[0-9]/.test(password)) {
      setError("Mật khẩu phải có ít nhất một chữ số.");
      return;
    }
    if (mode === "register" && new TextEncoder().encode(password).length > 72) {
      setError("Mật khẩu quá dài. Vui lòng rút ngắn mật khẩu.");
      return;
    }

    setBusy(true);
    try {
      const endpoint = mode === "register" ? "register" : "login";
      const response = await fetch(`${apiUrl}/auth/${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          mode === "register"
            ? { name: name.trim(), email: normalizedEmail, password }
            : { email: normalizedEmail, password },
        ),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(
          Array.isArray(result.message)
            ? result.message.join(" ")
            : result.message || "Không thể đăng nhập lúc này.",
        );
      }

      localStorage.setItem("brewlite_access_token", result.accessToken);
      const meResponse = await fetch(`${apiUrl}/users/me`, {
        headers: { Authorization: `Bearer ${result.accessToken}` },
      });
      if (!meResponse.ok) throw new Error("Đăng nhập được nhưng chưa tải được hồ sơ.");
      const userProfile: UserProfile = await meResponse.json();
      const returnPath = getReturnPath();
      if (returnPath) {
        window.location.replace(returnPath);
        return;
      }

      setProfile(userProfile);
      setPassword("");
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Không thể kết nối máy chủ. Hãy kiểm tra API đang chạy.",
      );
    } finally {
      setBusy(false);
    }
  }

  function signOut() {
    localStorage.removeItem("brewlite_access_token");
    setProfile(null);
    setMode("login");
  }

  return (
    <main className="auth-shell">
      <header className="site-header">
        <a className="brand" href="/" aria-label="BrewLite trang chủ">
          <span className="brand-mark" aria-hidden="true">B</span>
          <span>BrewLite</span>
        </a>
        <span className="nav-note">FRESHLY BREWED · DAILY</span>
      </header>
      <section className="auth-visual" aria-label="BrewLite">
        <div className="welcome-copy">
          <span className="eyebrow">A LITTLE BREAK, A LOT OF JOY</span>
          <h2>Mỗi ngày một<br /><em>chút dịu dàng.</em></h2>
          <p>Đăng nhập để theo dõi điểm thưởng và tiếp tục chọn món yêu thích.</p>
        </div>
        <div className="visual-note"><span>MỘT CHẠM THANH TOÁN</span><span>•</span><span>TRỌN VỊ YÊU THÍCH</span></div>
      </section>

      <section className="auth-panel">
        <div className="form-wrap">
          {profile ? (
            <div className="profile-card">
              <span className="eyebrow">TÀI KHOẢN CỦA BẠN</span>
              <div className="avatar">{profile.name.charAt(0).toUpperCase()}</div>
              <h2>Chào {profile.name}!</h2>
              <p className="profile-email">{profile.email}</p>
              <div className="points-card">
                <span>Điểm tích lũy</span>
                <strong>{profile.loyaltyPoints}<small> điểm</small></strong>
              </div>
              <button className="submit-button" onClick={signOut}>Đăng xuất</button>
            </div>
          ) : (
            <>
              <div className="mobile-brand brand">
                <span className="brand-mark">B</span><span>brew<span className="brand-light">lite</span></span>
              </div>
              <span className="eyebrow">CHÀO MỪNG ĐẾN VỚI BREWLITE</span>
              <h2>{mode === "login" ? "Rất vui gặp lại bạn" : "Tạo tài khoản mới"}</h2>
              <p className="form-intro">
                {mode === "login" ? "Đăng nhập để tiếp tục hành trình thưởng thức." : "Tham gia cùng BrewLite để nhận ưu đãi và tích điểm."}
              </p>

              <div className="mode-switch" role="tablist" aria-label="Chọn hình thức">
                <button type="button" role="tab" aria-selected={mode === "login"} className={mode === "login" ? "active" : ""} onClick={() => { setMode("login"); setError(""); }}>Đăng nhập</button>
                <button type="button" role="tab" aria-selected={mode === "register"} className={mode === "register" ? "active" : ""} onClick={() => { setMode("register"); setError(""); }}>Đăng ký</button>
              </div>

              <form onSubmit={submit} noValidate>
                {mode === "register" && (
                  <label className="field">
                    <span>Họ và tên</span>
                    <input autoComplete="name" value={name} onChange={(event) => setName(event.target.value)} placeholder="Nguyễn Minh Anh" required minLength={2} maxLength={80} />
                  </label>
                )}
                <label className="field">
                  <span>Email</span>
                  <input type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="ban@email.com" required maxLength={254} />
                </label>
                <label className="field">
                  <span>Mật khẩu</span>
                  <input type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Ít nhất 6 ký tự" required minLength={6} maxLength={72} />
                </label>
                {error && <p className="form-error" role="alert">{error}</p>}
                <button className="submit-button" type="submit" disabled={busy}>
                  {busy ? "Đang xử lý…" : mode === "login" ? "Đăng nhập" : "Tạo tài khoản"}
                  {!busy && <span aria-hidden="true">↗</span>}
                </button>
              </form>
              <p className="terms">Bằng cách tiếp tục, bạn đồng ý với điều khoản sử dụng của BrewLite.</p>
            </>
          )}
        </div>
        <footer className="panel-footer"><span>© 2026 BrewLite</span><span>Made for your slow mornings.</span></footer>
      </section>
    </main>
  );
}
