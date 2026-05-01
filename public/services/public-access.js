// 🔓 Manejo de acceso público (login / register / demo)

export function getAccessMode() {
  const params = new URLSearchParams(window.location.search);

  return {
    isDemo: params.get("demo") === "1",
    isLogin: params.get("login") === "1",
    isRegister: params.get("register") === "1"
  };
}

export function handlePublicAccess({ showLogin, showRegister, startDemo }) {
  const { isDemo, isLogin, isRegister } = getAccessMode();

  // 🎮 DEMO
  if (isDemo) {
    startDemo();
    return;
  }

  // 📝 REGISTER
  if (isRegister) {
    showRegister();
    return;
  }

  // 🔐 LOGIN (default)
  showLogin();
}
