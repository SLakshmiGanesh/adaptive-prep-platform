import { Shell } from "@/components/Shell";

export default function AuthPage() {
  return (
    <Shell active="auth">
      <div className="card" style={{ maxWidth: 480 }}>
        <h1>Student Login</h1>
        <p className="muted">Demo authentication is ready for JWT integration.</p>
        <form className="tutor-form">
          <input placeholder="Email" type="email" />
          <input placeholder="Password" type="password" />
          <button className="primary" type="button">Continue</button>
        </form>
      </div>
    </Shell>
  );
}
