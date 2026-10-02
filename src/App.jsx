import { useEffect, useState } from "react";
import {
  login,
  logout,
  isLoggedIn,
  currentUser,
  getProducts,
  addProduct,
  updateProduct,
  deleteProduct,
  errorMessage,
} from "./api";

const EMPTY_FORM = { product_name: "", description: "", price: "", quantity: "" };

const peso = (value) =>
  "₱" + Number(value).toLocaleString("en-PH", { minimumFractionDigits: 2 });

export default function App() {
  const [loggedIn, setLoggedIn] = useState(isLoggedIn());
  const [notice, setNotice] = useState("");

  function handleLogout(message = "") {
    logout();
    setNotice(message);
    setLoggedIn(false);
  }

  return loggedIn ? (
    <Products onLogout={handleLogout} />
  ) : (
    <Login notice={notice} onLogin={() => setLoggedIn(true)} />
  );
}

/* ---------------- Login ---------------- */

function Login({ notice, onLogin }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await login(username, password);
      onLogin();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="login">
      <form className="login-card" onSubmit={handleSubmit}>
        <h1>Stockroom</h1>
        <p className="muted">Log in to manage your products.</p>

        {notice && <p className="alert alert-info">{notice}</p>}
        {error && <p className="alert alert-error">{error}</p>}

        <label htmlFor="username">Username</label>
        <input
          id="username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          autoComplete="username"
          required
        />

        <label htmlFor="password">Password</label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          required
        />

        <button className="btn btn-primary" disabled={busy}>
          {busy ? "Logging in…" : "Log in"}
        </button>
      </form>
    </main>
  );
}

/* ---------------- Products ---------------- */

function Products({ onLogout }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState(null); // null = adding a new product
  const [saving, setSaving] = useState(false);

  // A 401 means the token is missing or expired, so send the user back to login.
  function handleError(err) {
    if (err.response?.status === 401) {
      onLogout("Your session expired. Log in again.");
    } else {
      setError(errorMessage(err));
    }
  }

  async function loadProducts() {
    try {
      setProducts(await getProducts());
      setError("");
    } catch (err) {
      handleError(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  function startEdit(product) {
    setEditingId(product.id);
    setForm({
      product_name: product.product_name,
      description: product.description || "",
      price: product.price,
      quantity: product.quantity,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(EMPTY_FORM);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    const payload = {
      ...form,
      price: Number(form.price),
      quantity: Number(form.quantity),
    };
    try {
      if (editingId) {
        await updateProduct(editingId, payload);
      } else {
        await addProduct(payload);
      }
      cancelEdit();
      await loadProducts();
    } catch (err) {
      handleError(err);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(product) {
    if (!window.confirm(`Delete "${product.product_name}"? This can't be undone.`)) return;
    try {
      await deleteProduct(product.id);
      if (editingId === product.id) cancelEdit();
      await loadProducts();
    } catch (err) {
      handleError(err);
    }
  }

  return (
    <>
      <header className="topbar">
        <strong className="brand">Stockroom</strong>
        <div className="topbar-right">
          <span className="muted">Logged in as {currentUser()}</span>
          <button className="btn btn-quiet" onClick={() => onLogout()}>
            Log out
          </button>
        </div>
      </header>

      <main className="page">
        {error && <p className="alert alert-error">{error}</p>}

        <section className="panel">
          <h2>{editingId ? "Edit product" : "Add a product"}</h2>
          <form className="product-form" onSubmit={handleSubmit}>
            <div className="field field-wide">
              <label htmlFor="product_name">Product name</label>
              <input
                id="product_name"
                name="product_name"
                value={form.product_name}
                onChange={handleChange}
                maxLength={100}
                required
              />
            </div>
            <div className="field">
              <label htmlFor="price">Price (₱)</label>
              <input
                id="price"
                name="price"
                type="number"
                min="0"
                step="0.01"
                value={form.price}
                onChange={handleChange}
                required
              />
            </div>
            <div className="field">
              <label htmlFor="quantity">Quantity</label>
              <input
                id="quantity"
                name="quantity"
                type="number"
                min="0"
                step="1"
                value={form.quantity}
                onChange={handleChange}
                required
              />
            </div>
            <div className="field field-full">
              <label htmlFor="description">Description</label>
              <textarea
                id="description"
                name="description"
                rows="2"
                value={form.description}
                onChange={handleChange}
              />
            </div>
            <div className="form-actions">
              <button className="btn btn-primary" disabled={saving}>
                {saving ? "Saving…" : editingId ? "Save changes" : "Add product"}
              </button>
              {editingId && (
                <button type="button" className="btn btn-quiet" onClick={cancelEdit}>
                  Cancel
                </button>
              )}
            </div>
          </form>
        </section>

        <section className="panel">
          <h2>
            Products <span className="count">{products.length}</span>
          </h2>

          {loading ? (
            <p className="muted">Loading products…</p>
          ) : products.length === 0 ? (
            <p className="muted">No products yet. Add your first one using the form above.</p>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Product</th>
                    <th className="num">Price</th>
                    <th className="num">Quantity</th>
                    <th>Added</th>
                    <th className="actions-col">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((p) => (
                    <tr key={p.id} className={editingId === p.id ? "row-editing" : ""}>
                      <td>
                        <div className="product-name">{p.product_name}</div>
                        {p.description && <div className="muted small">{p.description}</div>}
                      </td>
                      <td className="num">{peso(p.price)}</td>
                      <td className="num">
                        <span className={Number(p.quantity) <= 5 ? "stock stock-low" : "stock"}>
                          {p.quantity}
                        </span>
                      </td>
                      <td className="muted small">{String(p.created_at).slice(0, 10)}</td>
                      <td className="actions-col">
                        <button className="btn btn-small" onClick={() => startEdit(p)}>
                          Edit
                        </button>
                        <button className="btn btn-small btn-danger" onClick={() => handleDelete(p)}>
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </>
  );
}
