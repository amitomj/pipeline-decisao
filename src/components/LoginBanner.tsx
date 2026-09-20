import { auth } from "../firebaseConfig";
import { signInWithPopup, GoogleAuthProvider, signOut, User } from "firebase/auth";
import { LogIn, LogOut, UserCheck, Shield } from "lucide-react";
import { useState, useEffect } from "react";

interface LoginBannerProps {
  onUserChange: (user: User | null) => void;
}

export default function LoginBanner({ onUserChange }: LoginBannerProps) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setCurrentUser(user);
      onUserChange(user);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [onUserChange]);

  const handleSignIn = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const provider = new GoogleAuthProvider();
      // Enforce custom Google parameters if needed
      provider.setCustomParameters({ prompt: "select_account" });
      await signInWithPopup(auth, provider);
    } catch (e: any) {
      console.error("Erro ao autenticar com Google:", e);
      setErrorMsg(
        e.code === "auth/popup-blocked"
          ? "O popup de autenticação foi bloqueado pelo navegador. Ative os popups para este site."
          : "Falha na ligação com o Google Firebase. Tente novamente."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      await signOut(auth);
    } catch (e: any) {
      console.error("Erro ao sair:", e);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center space-x-2 bg-gray-50 border border-gray-200 px-3 py-1.5 rounded-xl animate-pulse">
        <div className="w-4 h-4 rounded-full bg-gray-300 animate-bounce"></div>
        <span className="text-xs text-gray-500 font-medium font-sans">A ligar ao Firebase...</span>
      </div>
    );
  }

  if (currentUser) {
    return (
      <div className="flex items-center space-x-3 bg-white border border-gray-150 px-3.5 py-1.5 rounded-xl shadow-xs">
        {currentUser.photoURL ? (
          <img
            src={currentUser.photoURL}
            alt={currentUser.displayName || "Avatar"}
            className="w-7 h-7 rounded-full border border-gray-200"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="w-7 h-7 rounded-full bg-neutral-900 flex items-center justify-center text-white text-xs font-semibold">
            {currentUser.displayName ? currentUser.displayName[0].toUpperCase() : "U"}
          </div>
        )}
        <div className="hidden sm:block text-left">
          <p className="text-xs font-semibold text-gray-900 leading-tight">
            {currentUser.displayName || "Utilizador Válido"}
          </p>
          <div className="flex items-center text-[10px] text-emerald-600 font-medium">
            <UserCheck className="w-3 h-3 mr-0.5" />
            <span>Firebase Ativo</span>
          </div>
        </div>
        <button
          onClick={handleSignOut}
          title="Sair do Firebase"
          className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
      {errorMsg && (
        <span className="text-xs text-red-600 bg-red-50 border border-red-100 px-3 py-1.5 rounded-lg max-w-xs truncate">
          {errorMsg}
        </span>
      )}
      <button
        onClick={handleSignIn}
        className="flex items-center space-x-2 bg-neutral-900 hover:bg-neutral-800 text-white font-medium text-xs px-3.5 py-2 rounded-xl transition-all duration-150 hover:shadow-xs cursor-pointer active:scale-95"
      >
        <LogIn className="w-3.5 h-3.5" />
        <span>Autenticar com Google</span>
      </button>
      <div className="hidden md:flex items-center text-[10px] text-gray-400 space-x-1">
        <Shield className="w-3 h-3" />
        <span>Para persistir as suas escolhas</span>
      </div>
    </div>
  );
}
