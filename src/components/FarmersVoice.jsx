import React, { useEffect, useState } from "react";
import { auth, db } from "../firebase";
import { useAuthState } from "react-firebase-hooks/auth";
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { MessageSquare, Edit3, Save, Loader2, Star } from "lucide-react";
import toast, { Toaster } from "react-hot-toast";
import { motion } from "framer-motion";

export default function FarmersVoice() {
  const [user, loadingAuth] = useAuthState(auth);
  const navigate = useNavigate();

  const [feedback, setFeedback] = useState("");
  const [feedbackType, setFeedbackType] = useState("Suggestion");
  const [rating, setRating] = useState(0);
  const [savedFeedback, setSavedFeedback] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // 🚪 Redirect if not logged in
  useEffect(() => {
    if (loadingAuth) return;
    if (!user) {
      toast.error("Please log in first!");
      navigate("/farmer-login");
    }
  }, [user, loadingAuth, navigate]);

  // 🔍 Fetch existing feedback
  useEffect(() => {
    const fetchFeedback = async () => {
      if (!user) return;
      setLoading(true);
      try {
        const ref = doc(db, "feedback", user.uid);
        const snap = await getDoc(ref);

        if (snap.exists()) {
          const data = snap.data();
          setSavedFeedback(data);
          setFeedback(data.text || "");
          setFeedbackType(data.type || "Suggestion");
          setRating(data.rating || 0);
        }
      } catch (err) {
        console.error("Error loading feedback:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchFeedback();
  }, [user]);

  // 💾 Save or update feedback
  const handleSave = async () => {
    if (!feedback.trim()) return toast.error("Feedback cannot be empty!");
    if (rating === 0) return toast.error("Please give a rating!");
    setSaving(true);
    try {
      const ref = doc(db, "feedback", user.uid);
      const data = {
        uid: user.uid,
        email: user.email,
        text: feedback,
        type: feedbackType,
        rating,
        lastUpdated: serverTimestamp(),
      };

      if (savedFeedback) {
        await updateDoc(ref, data);
        toast.success("✨ Feedback updated!");
      } else {
        await setDoc(ref, {
          ...data,
          createdAt: serverTimestamp(),
        });
        toast.success("✅ Feedback submitted!");
      }
      setSavedFeedback(data);
      setIsEditing(false);
    } catch (err) {
      console.error(err);
      toast.error("Something went wrong. Try again.");
    } finally {
      setSaving(false);
    }
  };

  // ⭐ Render stars
  const StarRating = () => (
    <div className="flex items-center gap-1 mb-2">
      {[1, 2, 3, 4, 5].map((num) => (
        <Star
          key={num}
          size={24}
          className={`cursor-pointer transition ${
            num <= rating ? "text-yellow-400 fill-yellow-400" : "text-gray-400"
          }`}
          onClick={() => setRating(num)}
        />
      ))}
    </div>
  );

  if (loading || loadingAuth)
    return (
      <div className="flex justify-center items-center min-h-screen text-gray-600 dark:text-gray-300">
        <Loader2 className="animate-spin mr-2" /> Loading feedback...
      </div>
    );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-neutral-950 flex items-center justify-center p-6">
      <Toaster position="bottom-center" />
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-2xl bg-white dark:bg-neutral-900 p-8 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-800"
      >
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-green-700 dark:text-green-400 flex items-center gap-2">
            <MessageSquare /> Farmer’s Voice
          </h1>
          {savedFeedback && !isEditing && (
            <button
              onClick={() => setIsEditing(true)}
              className="flex items-center gap-1 text-blue-600 text-sm hover:underline"
            >
              <Edit3 size={16} /> Edit
            </button>
          )}
        </div>

        <p className="text-gray-600 dark:text-gray-400 mb-4">
          Share your thoughts, feedback, or ideas about AgriAssist. Your voice helps us grow 🌾
        </p>

        {isEditing || !savedFeedback ? (
          <div className="space-y-4">
            <div>
              <label className="block text-sm mb-1 text-gray-700 dark:text-gray-300">
                Feedback Type
              </label>
              <select
                value={feedbackType}
                onChange={(e) => setFeedbackType(e.target.value)}
                className="w-full p-2 border rounded-lg bg-gray-50 dark:bg-neutral-800 text-gray-800 dark:text-gray-100"
              >
                <option>Suggestion</option>
                <option>Complaint</option>
                <option>Appreciation</option>
                <option>Bug Report</option>
                <option>Other</option>
              </select>
            </div>

            <div>
              <label className="block text-sm mb-1 text-gray-700 dark:text-gray-300">
                Rating
              </label>
              <StarRating />
            </div>

            <textarea
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="Write your feedback here..."
              className="w-full p-3 border rounded-lg bg-gray-50 dark:bg-neutral-800 text-gray-800 dark:text-gray-100 h-32 resize-none focus:ring-2 focus:ring-green-500"
            />

            <button
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-full hover:scale-[1.05] active:scale-[0.97] transition-transform shadow-md"
            >
              {saving ? <Loader2 className="animate-spin w-4 h-4" /> : <Save size={18} />}
              {savedFeedback ? "Update Feedback" : "Submit Feedback"}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500 dark:text-gray-400">
                Type: <b>{savedFeedback.type}</b>
              </span>
              <div className="flex">
                {[1, 2, 3, 4, 5].map((num) => (
                  <Star
                    key={num}
                    size={20}
                    className={`${
                      num <= savedFeedback.rating
                        ? "text-yellow-400 fill-yellow-400"
                        : "text-gray-400"
                    }`}
                  />
                ))}
              </div>
            </div>
            <div className="bg-gray-100 dark:bg-neutral-800 p-4 rounded-lg text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
              {savedFeedback.text}
            </div>
          </div>
        )}

        <div className="text-center mt-6">
          <button
            onClick={() => navigate("/profile")}
            className="text-sm text-gray-500 hover:text-green-600 transition"
          >
            ← Back to Profile
          </button>
        </div>
      </motion.div>
    </div>
  );
}
