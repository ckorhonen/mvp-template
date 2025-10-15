import { useState } from 'react';
import './App.css';

function App() {
  const [count, setCount] = useState(0);

  return (
    <div className="app">
      <header className="app-header">
        <h1>🚀 MVP Template</h1>
        <p>TypeScript + React + Cloudflare Workers</p>
      </header>

      <main className="app-main">
        <section className="card">
          <h2>Quick Start</h2>
          <p>Your rapid MVP development environment is ready!</p>
          
          <div className="counter">
            <button onClick={() => setCount(count - 1)}>-</button>
            <span className="count">{count}</span>
            <button onClick={() => setCount(count + 1)}>+</button>
          </div>

          <div className="features">
            <h3>✨ Features</h3>
            <ul>
              <li>✅ TypeScript with strict mode</li>
              <li>✅ React 18 with Vite</li>
              <li>✅ ESLint + Prettier</li>
              <li>✅ Jest testing setup</li>
              <li>✅ GitHub Actions CI/CD</li>
              <li>✅ Cloudflare Workers ready</li>
              <li>✅ Pre-commit hooks</li>
            </ul>
          </div>
        </section>

        <section className="card">
          <h2>Next Steps</h2>
          <ol>
            <li>Update <code>wrangler.toml</code> with your Cloudflare account ID</li>
            <li>Add your secrets to GitHub Actions</li>
            <li>Start building your MVP!</li>
          </ol>
        </section>
      </main>

      <footer className="app-footer">
        <p>Built with ❤️ for rapid MVP development</p>
      </footer>
    </div>
  );
}

export default App;
