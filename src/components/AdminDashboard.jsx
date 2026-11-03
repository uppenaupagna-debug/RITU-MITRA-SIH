// AdminDashboard.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Shield,
  BarChart,
  Bell,
  Leaf,
  LogOut,
  Edit,
  Trash2,
  PlusCircle,
  User,
  X,
  Menu,
  Save,
  CheckCircle2,
} from "lucide-react";
import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { signOut, updatePassword } from "firebase/auth";
import { db, auth } from "../firebase";

/* ---------------------------
   Common UI
--------------------------- */
const Card = ({ children, className = "" }) => (
  <div className={`bg-white dark:bg-gray-800 rounded-lg shadow p-6 ${className}`}>
    {children}
  </div>
);

const CardTitle = ({ children }) => (
  <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-gray-100">{children}</h2>
);

const Button = ({
  children,
  onClick,
  className = "bg-green-600 hover:bg-green-700",
  type = "button",
  disabled = false,
}) => (
  <button
    onClick={onClick}
    type={type}
    disabled={disabled}
    className={`px-4 py-2 text-white font-semibold rounded-lg shadow transition-colors disabled:opacity-60 disabled:cursor-not-allowed ${className}`}
  >
    {children}
  </button>
);

const Input = React.forwardRef(({ value, onChange, placeholder, type = "text", name }, ref) => (
  <input
    ref={ref}
    type={type}
    name={name}
    placeholder={placeholder}
    value={value}
    onChange={onChange}
    className="w-full p-2 border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-gray-800 dark:text-gray-200"
  />
));
Input.displayName = "Input";

const TextArea = ({ value, onChange, placeholder, name, rows = 4 }) => (
  <textarea
    name={name}
    value={value}
    onChange={onChange}
    placeholder={placeholder}
    rows={rows}
    className="w-full p-2 border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-gray-800 dark:text-gray-200"
  />
);

const Select = ({ value, onChange, name, children }) => (
  <select
    name={name}
    value={value}
    onChange={onChange}
    className="w-full p-2 border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-gray-800 dark:text-gray-200"
  >
    {children}
  </select>
);

const Modal = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex justify-center items-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md">
        <div className="flex justify-between items-center p-4 border-b dark:border-gray-700">
          <h3 className="text-xl font-bold">{title}</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-800 dark:hover:text-gray-200">
            <X size={22} />
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
};

/* ---------------------------
   MSP Forms & View (Firestore)
--------------------------- */
function MspForm({ onSave, onCancel, msp }) {
  // tolerate both price/value and note/description from old docs
  const [formData, setFormData] = useState({
    crop: msp?.crop || "",
    price: msp?.price ?? msp?.value ?? "",
    note: msp?.note ?? msp?.description ?? "",
  });
  const firstInputRef = useRef(null);

  useEffect(() => {
    firstInputRef.current?.focus();
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    const payload = {
      crop: (formData.crop || "").trim(),
      // store as number when possible
      price:
        formData.price === "" || formData.price === null
          ? ""
          : Number(formData.price),
      note: (formData.note || "").trim(),
    };
    onSave(payload);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block mb-1 font-semibold">Crop Name</label>
        <Input
          ref={firstInputRef}
          name="crop"
          value={formData.crop}
          onChange={(e) => setFormData((p) => ({ ...p, crop: e.target.value }))}
          placeholder="e.g., Paddy (Grade A)"
        />
      </div>
      <div>
        <label className="block mb-1 font-semibold">Price (₹ / Quintal)</label>
        <Input
          name="price"
          type="number"
          value={formData.price}
          onChange={(e) => setFormData((p) => ({ ...p, price: e.target.value }))}
          placeholder="e.g., 2203"
        />
      </div>
      <div>
        <label className="block mb-1 font-semibold">Note (optional)</label>
        <Input
          name="note"
          value={formData.note}
          onChange={(e) => setFormData((p) => ({ ...p, note: e.target.value }))}
          placeholder="e.g., Grade A"
        />
      </div>
      <div className="flex justify-end gap-3 pt-2">
        <Button onClick={onCancel} className="bg-gray-500 hover:bg-gray-600">
          Cancel
        </Button>
        <Button type="submit">
          <Save className="inline mr-2" size={18} />
          Save
        </Button>
      </div>
    </form>
  );
}

function ManageMsp() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingDoc, setEditingDoc] = useState(null);

  useEffect(() => {
    const q = query(collection(db, "msp"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setList(rows);
        setLoading(false);
      },
      () => setLoading(false)
    );
    return () => unsub();
  }, []);

  const openAdd = () => {
    setEditingDoc(null);
    setModalOpen(true);
  };
  const openEdit = (docObj) => {
    setEditingDoc(docObj);
    setModalOpen(true);
  };

  const onSave = async (payload) => {
    try {
      if (editingDoc) {
        await updateDoc(doc(db, "msp", editingDoc.id), {
          crop: payload.crop,
          // also keep 'value' in sync for older consumer UIs
          price: payload.price,
          value: payload.price,
          note: payload.note,
          description: payload.note,
          updatedAt: serverTimestamp(),
        });
      } else {
        await addDoc(collection(db, "msp"), {
          crop: payload.crop,
          price: payload.price,
          value: payload.price,
          note: payload.note,
          description: payload.note,
          createdAt: serverTimestamp(),
        });
      }
      setModalOpen(false);
    } catch (e) {
      alert("Failed to save MSP. Check console.");
      // eslint-disable-next-line no-console
      console.error(e);
    }
  };

  const onDelete = async (id) => {
    if (!window.confirm("Delete this MSP entry?")) return;
    try {
      await deleteDoc(doc(db, "msp", id));
    } catch (e) {
      alert("Failed to delete. Check console.");
      console.error(e);
    }
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <h1 className="text-3xl sm:text-4xl font-bold hidden md:block">Manage MSP Prices</h1>
        <Button onClick={openAdd}>
          <PlusCircle className="inline mr-2" size={18} />
          Add New MSP
        </Button>
      </div>

      <Card>
        {loading ? (
          <p>Loading MSPs…</p>
        ) : list.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">No records found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b dark:border-gray-600">
                  <th className="p-4 min-w-[160px]">Crop</th>
                  <th className="p-4 min-w-[160px]">Price (₹/Quintal)</th>
                  <th className="p-4 min-w-[160px]">Note</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {list.map((row) => {
                  const price = row.price ?? row.value ?? "";
                  const note = row.note ?? row.description ?? "";
                  return (
                    <tr
                      key={row.id}
                      className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                    >
                      <td className="p-4 font-semibold">{row.crop || "-"}</td>
                      <td className="p-4">
                        {price === "" ? "-" : `₹${Number(price).toLocaleString("en-IN")}`}
                      </td>
                      <td className="p-4">{note || "-"}</td>
                      <td className="p-4 text-right whitespace-nowrap">
                        <button onClick={() => openEdit(row)} className="text-blue-500 hover:text-blue-400 p-2">
                          <Edit size={18} />
                        </button>
                        <button onClick={() => onDelete(row.id)} className="text-red-500 hover:text-red-400 p-2">
                          <Trash2 size={18} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingDoc ? "Edit MSP Price" : "Add New MSP Price"}
      >
        <MspForm onSave={onSave} onCancel={() => setModalOpen(false)} msp={editingDoc} />
      </Modal>
    </div>
  );
}

/* ---------------------------
   Seeds (Firestore)
--------------------------- */
function SeedForm({ onSave, onCancel, seed }) {
  const [formData, setFormData] = useState({
    crop: seed?.crop || "",
    variety: seed?.variety ?? seed?.value ?? "",
    certification: seed?.certification ?? "",
    vendor: seed?.vendor ?? "",
    note: seed?.note ?? seed?.description ?? "",
  });
  const firstInputRef = useRef(null);
  useEffect(() => {
    firstInputRef.current?.focus();
  }, []);

  const submit = (e) => {
    e.preventDefault();
    onSave({
      crop: (formData.crop || "").trim(),
      variety: (formData.variety || "").trim(),
      certification: (formData.certification || "").trim(),
      vendor: (formData.vendor || "").trim(),
      note: (formData.note || "").trim(),
    });
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <label className="block mb-1 font-semibold">Crop</label>
        <Input ref={firstInputRef} value={formData.crop} onChange={(e) => setFormData((p) => ({ ...p, crop: e.target.value }))} />
      </div>
      <div>
        <label className="block mb-1 font-semibold">Variety</label>
        <Input value={formData.variety} onChange={(e) => setFormData((p) => ({ ...p, variety: e.target.value }))} />
      </div>
      <div>
        <label className="block mb-1 font-semibold">Certification</label>
        <Input value={formData.certification} onChange={(e) => setFormData((p) => ({ ...p, certification: e.target.value }))} />
      </div>
      <div>
        <label className="block mb-1 font-semibold">Vendor</label>
        <Input value={formData.vendor} onChange={(e) => setFormData((p) => ({ ...p, vendor: e.target.value }))} />
      </div>
      <div>
        <label className="block mb-1 font-semibold">Note (optional)</label>
        <Input value={formData.note} onChange={(e) => setFormData((p) => ({ ...p, note: e.target.value }))} />
      </div>
      <div className="flex justify-end gap-3 pt-2">
        <Button onClick={onCancel} className="bg-gray-500 hover:bg-gray-600">
          Cancel
        </Button>
        <Button type="submit">
          <Save className="inline mr-2" size={18} />
          Save
        </Button>
      </div>
    </form>
  );
}

function ManageSeeds() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingDoc, setEditingDoc] = useState(null);

  useEffect(() => {
    const q = query(collection(db, "seeds"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setList(rows);
        setLoading(false);
      },
      () => setLoading(false)
    );
    return () => unsub();
  }, []);

  const openAdd = () => {
    setEditingDoc(null);
    setModalOpen(true);
  };
  const openEdit = (docObj) => {
    setEditingDoc(docObj);
    setModalOpen(true);
  };

  const onSave = async (payload) => {
    try {
      if (editingDoc) {
        await updateDoc(doc(db, "seeds", editingDoc.id), {
          crop: payload.crop,
          variety: payload.variety,
          certification: payload.certification,
          vendor: payload.vendor,
          note: payload.note,
          description: payload.note,
          updatedAt: serverTimestamp(),
        });
      } else {
        await addDoc(collection(db, "seeds"), {
          crop: payload.crop,
          variety: payload.variety,
          certification: payload.certification,
          vendor: payload.vendor,
          note: payload.note,
          description: payload.note,
          createdAt: serverTimestamp(),
        });
      }
      setModalOpen(false);
    } catch (e) {
      alert("Failed to save seed listing.");
      console.error(e);
    }
  };

  const onDelete = async (id) => {
    if (!window.confirm("Delete this seed listing?")) return;
    try {
      await deleteDoc(doc(db, "seeds", id));
    } catch (e) {
      alert("Failed to delete.");
      console.error(e);
    }
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <h1 className="text-3xl sm:text-4xl font-bold hidden md:block">Manage Seed Listings</h1>
        <Button onClick={openAdd}>
          <PlusCircle className="inline mr-2" size={18} />
          Add New Listing
        </Button>
      </div>

      <Card>
        {loading ? (
          <p>Loading seeds…</p>
        ) : list.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">No records found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b dark:border-gray-600">
                  <th className="p-4 min-w-[120px]">Crop</th>
                  <th className="p-4 min-w-[120px]">Variety</th>
                  <th className="p-4 min-w-[140px]">Certification</th>
                  <th className="p-4 min-w-[120px]">Vendor</th>
                  <th className="p-4 min-w-[140px]">Note</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {list.map((row) => (
                  <tr
                    key={row.id}
                    className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                  >
                    <td className="p-4 font-semibold">{row.crop || "-"}</td>
                    <td className="p-4">{row.variety ?? row.value ?? "-"}</td>
                    <td className="p-4">{row.certification || "-"}</td>
                    <td className="p-4">{row.vendor || "-"}</td>
                    <td className="p-4">
  {(() => {
    const note = row.note ?? row.description ?? "-";

    // detect website-like strings (.in, .com, .org, .net, .io, etc.)
    const linkPattern = /(https?:\/\/[^\s]+|www\.[^\s]+|\S+\.(com|in|org|net|io|co|gov|edu))/i;
    const hasLink = linkPattern.test(note);

    if (hasLink) {
      let url = note.trim();

      // Add https:// if missing
      if (!/^https?:\/\//i.test(url)) {
        url = "https://" + url.replace(/^www\./, "www.");
      }

      return (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1"
        >
          {note}
        </a>
      );
    }

    return note || "-";
  })()}
</td>
                    <td className="p-4 text-right whitespace-nowrap">
                      <button onClick={() => openEdit(row)} className="text-blue-500 hover:text-blue-400 p-2">
                        <Edit size={18} />
                      </button>
                      <button onClick={() => onDelete(row.id)} className="text-red-500 hover:text-red-400 p-2">
                        <Trash2 size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingDoc ? "Edit Seed Listing" : "Add New Seed Listing"}
      >
        <SeedForm onSave={onSave} onCancel={() => setModalOpen(false)} seed={editingDoc} />
      </Modal>
    </div>
  );
}

/* ---------------------------
   Notifications (Firestore)
--------------------------- */
function ManageNotifications() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    title: "",
    body: "",
    priority: "Low",
    expiry: "",
    active: true,
  });

  useEffect(() => {
    const q = query(collection(db, "notifications"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setList(rows);
        setLoading(false);
      },
      () => setLoading(false)
    );
    return () => unsub();
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.body.trim()) {
      alert("Please fill in the title and body.");
      return;
    }
    try {
      await addDoc(collection(db, "notifications"), {
        title: form.title.trim(),
        body: form.body.trim(),
        priority: form.priority || "Low",
        expiry: form.expiry || "",
        date: new Date().toISOString().slice(0, 10),
        active: !!form.active,
        createdAt: serverTimestamp(),
      });
      setForm({ title: "", body: "", priority: "Low", expiry: "", active: true });
    } catch (e) {
      alert("Failed to add notification.");
      console.error(e);
    }
  };

  const onDelete = async (id) => {
    if (!window.confirm("Delete this notification?")) return;
    try {
      await deleteDoc(doc(db, "notifications", id));
    } catch (e) {
      alert("Failed to delete notification.");
      console.error(e);
    }
  };

  const toggleActive = async (n) => {
    try {
      await updateDoc(doc(db, "notifications", n.id), { active: !n.active, updatedAt: serverTimestamp() });
    } catch (e) {
      alert("Failed to update notification.");
      console.error(e);
    }
  };

  const priorityClass = useMemo(
    () => ({
      Low: "border-blue-500 bg-blue-50 dark:bg-blue-900/30",
      Medium: "border-yellow-500 bg-yellow-50 dark:bg-yellow-900/30",
      High: "border-red-500 bg-red-50 dark:bg-red-900/30",
    }),
    []
  );

  return (
    <div>
      <h1 className="text-3xl sm:text-4xl font-bold mb-6 hidden md:block">Publish Notifications</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Create */}
        <Card>
          <CardTitle>Create New Notification</CardTitle>
          <form className="space-y-4" onSubmit={submit}>
            <Input
              name="title"
              value={form.title}
              onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
              placeholder="Notification Title"
            />
            <TextArea
              name="body"
              value={form.body}
              onChange={(e) => setForm((p) => ({ ...p, body: e.target.value }))}
              placeholder="Notification Body..."
            />
            <Select
              name="priority"
              value={form.priority}
              onChange={(e) => setForm((p) => ({ ...p, priority: e.target.value }))}
            >
              <option>Low</option>
              <option>Medium</option>
              <option>High</option>
            </Select>
            <Input
              name="expiry"
              type="date"
              value={form.expiry}
              onChange={(e) => setForm((p) => ({ ...p, expiry: e.target.value }))}
              placeholder="Expiry Date"
            />
            <div className="flex items-center gap-2">
              <input
                id="active"
                type="checkbox"
                checked={form.active}
                onChange={(e) => setForm((p) => ({ ...p, active: e.target.checked }))}
                className="w-4 h-4 accent-green-600"
              />
              <label htmlFor="active">Active</label>
            </div>
            <div className="flex justify-end">
              <Button type="submit">Publish Notification</Button>
            </div>
          </form>
        </Card>

        {/* List */}
        <Card>
          <CardTitle>Active Notifications</CardTitle>
          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
            {loading && <p>Loading notifications…</p>}
            {!loading && list.length === 0 && (
              <p className="text-sm text-gray-500 dark:text-gray-400">No notifications found.</p>
            )}
            {!loading &&
              list.map((n) => (
                <div
                  key={n.id}
                  className={`p-4 border-l-4 rounded-r-lg ${priorityClass[n.priority || "Low"]}`}
                >
                  <div className="flex justify-between items-start gap-3">
                    <div>
                      <h3 className="font-bold text-gray-800 dark:text-gray-100">{n.title}</h3>
                      <p className="text-sm text-gray-700 dark:text-gray-300">{n.body}</p>
                      <div className="flex flex-wrap gap-3 mt-2 text-xs text-gray-600 dark:text-gray-300">
                        {n.priority && (
                          <span className="inline-flex items-center gap-1">
                            <BarChart size={14} /> {n.priority}
                          </span>
                        )}
                        {n.expiry && <span>Expires: {n.expiry}</span>}
                        {n.date && <span>Published: {n.date}</span>}
                        {typeof n.active === "boolean" && (
                          <span className={`inline-flex items-center gap-1 ${n.active ? "text-green-600" : "text-gray-500"}`}>
                            <CheckCircle2 size={14} />
                            {n.active ? "Active" : "Inactive"}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => toggleActive(n)}
                        className="text-green-600 hover:text-green-500 p-2"
                        title="Toggle Active"
                      >
                        <CheckCircle2 size={18} />
                      </button>
                      <button
                        onClick={() => onDelete(n.id)}
                        className="text-red-500 hover:text-red-400 p-2"
                        title="Delete"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

/* ---------------------------
   Profile (basic)
--------------------------- */
function ProfilePage({ onLogout }) {
  const [pw, setPw] = useState({ current: "", next: "", confirm: "" });

  const submit = async (e) => {
    e.preventDefault();
    if (pw.next !== pw.confirm) return alert("New passwords do not match!");
    if (!auth.currentUser) return alert("Not logged in.");
    try {
      // NOTE: secure re-auth flow omitted for brevity
      await updatePassword(auth.currentUser, pw.next);
      alert("Password updated!");
      setPw({ current: "", next: "", confirm: "" });
    } catch (e) {
      alert("Password update failed (re-auth may be required).");
      console.error(e);
    }
  };

  return (
    <div>
      <h1 className="text-3xl sm:text-4xl font-bold mb-6 hidden md:block">Admin Profile</h1>
      <Card className="max-w-md">
        <CardTitle>Change Password</CardTitle>
        <form className="space-y-4" onSubmit={submit}>
          <div>
            <label className="block mb-1 font-semibold">New Password</label>
            <Input
              type="password"
              value={pw.next}
              onChange={(e) => setPw((p) => ({ ...p, next: e.target.value }))}
              placeholder="••••••••"
            />
          </div>
          <div>
            <label className="block mb-1 font-semibold">Confirm New Password</label>
            <Input
              type="password"
              value={pw.confirm}
              onChange={(e) => setPw((p) => ({ ...p, confirm: e.target.value }))}
              placeholder="••••••••"
            />
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <Button type="submit">Update Password</Button>
            <Button
              onClick={onLogout}
              className="bg-red-600 hover:bg-red-700"
              type="button"
            >
              Logout
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}

/* ---------------------------
   Main Dashboard Shell
--------------------------- */
export default function AdminDashboard() {
  const [activeView, setActiveView] = useState("msp"); // 'msp' | 'notifications' | 'seeds' | 'profile'
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut(auth);
    navigate("/admin");
  };

  const NavItem = ({ view, icon: Icon, label }) => {
    const active = activeView === view;
    return (
      <button
        onClick={() => {
          setActiveView(view);
          setIsMobileMenuOpen(false);
        }}
        className={`flex items-center w-full px-4 py-3 text-left rounded-lg transition-colors duration-200
          ${active ? "bg-gray-700 text-white" : "text-gray-200 hover:bg-gray-700"}`}
      >
        <Icon className="mr-3" size={20} />
        <span>{label}</span>
      </button>
    );
  };

  const renderView = () => {
    switch (activeView) {
      case "msp":
        return <ManageMsp />;
      case "notifications":
        return <ManageNotifications />;
      case "seeds":
        return <ManageSeeds />;
      case "profile":
        return <ProfilePage onLogout={handleLogout} />;
      default:
        return <ManageMsp />;
    }
  };

  const currentTitle = {
    msp: "Manage MSP",
    notifications: "Notifications",
    seeds: "Seed Listings",
    profile: "Profile",
  }[activeView];

  return (
    <div className="flex min-h-screen bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-200">
      {/* Mobile Header */}
      <header className="md:hidden fixed top-0 left-0 right-0 bg-gray-800 text-white p-4 flex justify-between items-center z-10">
        <h1 className="text-xl font-bold">{currentTitle}</h1>
        <button onClick={() => setIsMobileMenuOpen(true)} className="p-2">
          <Menu size={24} />
        </button>
      </header>

      {/* Desktop Sidebar */}
      <aside className="w-64 bg-gray-800 text-white p-4 flex flex-col justify-between hidden md:flex">
        <div>
          <div className="flex items-center mb-8">
            <Shield className="text-green-400" size={32} />
            <h1 className="text-2xl font-bold ml-2">Admin Panel</h1>
          </div>
          <nav className="space-y-2">
            <NavItem view="msp" icon={BarChart} label="Manage MSP" />
            <NavItem view="notifications" icon={Bell} label="Notifications" />
            <NavItem view="seeds" icon={Leaf} label="Seed Listings" />
            <NavItem view="profile" icon={User} label="Profile" />
          </nav>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center w-full px-4 py-3 text-left text-gray-200 hover:bg-gray-700 rounded-lg transition-colors duration-200"
        >
          <LogOut className="mr-3" size={20} />
          <span>Logout</span>
        </button>
      </aside>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 bg-gray-800 z-50 p-4 flex flex-col justify-between md:hidden">
          <div>
            <div className="flex justify-between items-center mb-8">
              <div className="flex items-center">
                <Shield className="text-green-400" size={32} />
                <h1 className="text-2xl font-bold ml-2 text-white">Admin Panel</h1>
              </div>
              <button onClick={() => setIsMobileMenuOpen(false)} className="text-white p-2">
                <X size={24} />
              </button>
            </div>
            <nav className="space-y-2">
              <NavItem view="msp" icon={BarChart} label="Manage MSP" />
              <NavItem view="notifications" icon={Bell} label="Notifications" />
              <NavItem view="seeds" icon={Leaf} label="Seed Listings" />
              <NavItem view="profile" icon={User} label="Profile" />
            </nav>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center w-full px-4 py-3 text-left text-gray-200 hover:bg-gray-700 rounded-lg transition-colors duration-200"
          >
            <LogOut className="mr-3" size={20} />
            <span>Logout</span>
          </button>
        </div>
      )}

      {/* Main */}
      <main className="flex-1 p-4 sm:p-8 overflow-y-auto pt-20 md:pt-8">{renderView()}</main>
    </div>
  );
}
